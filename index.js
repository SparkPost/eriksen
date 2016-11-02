'use strict';
let _ = require('lodash')
  , redis = require('redis')
  , modelQueue = false
  , schemas = {};

class ModelQueue {
  constructor(config, logger) {
    this.config = config;
    this.config.messageKey = this.config.messageKey || 'eriksen-metadata';

    this.queue = redis.createClient(config.queue);
    this.subscriber = this.queue.duplicate();

    let errorHandler = (err) => {
      logger.error('[Eriksen] Error from Redis', err);
    };

    this.log = logger;

    this.queue.on('error', errorHandler);
    this.subscriber.on('error', errorHandler);

    this.subscriber.on('message', (channel, message) => { this.handleQueueTransition(channel, message); });
    this.subscriber.on('subscribe', (channel, message) => { this.handleMetadataSubscription(channel, message); });

    this.subscriber.subscribe(this.config.messageKey);
  }

  handleMetadataSubscription(channel) {
    this.log.log('[Eriksen] subscribed to channel: ', channel);
  }

  handleQueueTransition(channel, message) {
    message = JSON.parse(message);
    this.log.log(`[Eriksen] transitioning queue state for ${message.model} to ${message.queue}`);

    if (message.model in schemas) {
      // If we were queueing, and then we received the command to flush, drain the queue
      if (schemas[message.model].schema.queueInProgress === true && message.queue === false) {
        this.drainQueue(message.model)
          .then((count) => {
            schemas[message.model].schema.queueInProgress = message.queue;
            this.log.log(`[Eriksen] Re-processed all ${count} messages for schema ${message.model}.`);
          })
          .catch((err) => {
            this.log.error('[Eriksen] Problem with reprocessing', err);
          });
      } else {
        schemas[message.model].schema.queueInProgress = message.queue;
      }
    }
  }

  drainQueue(model) {
    let queueKey = schemas[model].schema.config.queueKey
      , modelCallPromises = [];

    return new Promise((resolve, reject) => {
      this.getAllQueued(model, queueKey, modelCallPromises).then((allModelCalls) => {
        return Promise.all(allModelCalls);
      })
      .then((resolutions) => {
        resolve(resolutions.length);
      })
      .catch((err) => {
        reject(err);
      });
    });
  }

  getAllQueued(model, queueKey, modelCallPromises) {
    return this.getQueuedMessage(queueKey)
      .then((message) => {
        if (message === null) {
          return modelCallPromises;
        }

        message = JSON.parse(message);

        // For each queued command, apply the command to the relevant function with arguments
        schemas[model].models.forEach((backend) => {
          if (schemas[model].isSecondary(backend)) {
            let functionPromise = backend.model[message.func].apply(backend.model, message.args);

            modelCallPromises.push(
              Promise.resolve(functionPromise)
                .catch((err) => {
                  schemas[model].schema.config.logger.error('[Eriksen] Error during reprocessing:', err);
                  return true;
                })
            );
          }
        });

        return this.getAllQueued(model, queueKey, modelCallPromises);
      });
  }

  getQueuedMessage(queueKey) {
    return new Promise((resolve, reject) => {
      this.queue.lpop(queueKey, (err, message) => {
        if (err) {
          reject(err);
        } else {
          resolve(message);
        }
      });
    });
  }

  setQueueState(shouldQueue, messageKey) {
    this.queue.publish(this.config.messageKey, JSON.stringify({ queue: shouldQueue, model: messageKey }));
  }
}

class ModelProxy {
  constructor(conf) {
    this.name = conf.name;
    this.models = new Map();
    this.schema = conf.schema;
    this.config = conf.config;
    this._cache = new Map();
  }

  addModel(modelName, model) {
    model.name = modelName;

    this.models.set(modelName, model);

    _.forOwn(model.model, (method, name) => {
      if (_.isFunction(method)) {
        this.schema[name] = this.proxify(name);
      }
    });
  }

  isPrimary(model) {
    return this.schema.config.primary === model.name;
  }

  isSecondary(model) {
    return this.schema.config.primary !== model.name;
  }

  proxify(name) {
    // Can't use an ES6 shorthand here, need to be able to get arguments of
    // called function (not inherited from the proxy's this value)
    let self = this;

    return function() {
      let args = (arguments.length === 1) ? [arguments[0]] : Array.apply(null, arguments)
        , retValue = new Promise((resolve) => {
          resolve();
        });

      self.models.forEach((model) => {
        /* If the model backend is configured to wrap only certain methods, and this
         * is not one of those methods, then just return this iteration of the loop
         */
        if (Array.isArray(model.config.wrap) && model.config.wrap.indexOf(name) === -1) {
          return;
        }

        let modelReturn = self.callModelMethod(model, name, args);

        if (self.isPrimary(model)) {
          retValue = modelReturn;
        }
      });

      return retValue;
    };
  }

  callModelMethod(model, func, funcArgs) {
    let delay = (fn) => { return fn(); };

    if (this.isSecondary(model) && this.schema.config.waitTime) {
      delay = (fn) => {
        _.timeout(fn, this.schema.config.waitTime);
        return fn;
      };
    }

    if (this.isSecondary(model) && this.schema.queueInProgress) {
      this.schema.config.logger.log(`[Eriksen] Logging write to ${this.schema.config.queueKey}`);
      return modelQueue.queue.rpush(this.schema.config.queueKey, JSON.stringify({
        schema: this.name,
        model: model.name,
        func: func,
        args: funcArgs,
        datetime: new Date().toISOString()
      }));
    }

    return delay(() => {
      let modelReturn = model.model[func].apply(model.model, funcArgs);

      /* If the model method returned a promise, and if this model is not the primary
       * model, THEN we should swallow the error and use the configured logger to output
       * an error
       */
      if (modelReturn instanceof Promise && this.isSecondary(model)) {
        modelReturn.catch((e) => {
          this.schema.config.logger.error('[Eriksen] Captured error on secondary model', e);
        });
      }

      return modelReturn;
    });
  }
}

class Eriksen {
  constructor(schema) {
    schemas[schema] = new ModelProxy({
      name: schema,
      schema: this,
      config: {
        wrap: true
      }
    });

    this.schema = schemas[schema];
    this.config = {
      waitTime: 0,
      primary: null,
      queue: false,
      logger: { log: () => {}, info: () => {}, error: () => {} }
    };

    this.queueInProgress = false;
  }

  setQueueState(shouldQueue) {
    modelQueue.setQueueState(shouldQueue, this.schema.name);
  }

  addModel(modelName, model, methodsToWrap) {
    this.schema.addModel(modelName, {
      model: model,
      config: {
        wrap: methodsToWrap || true
      }
    });
  }

  configure(config) {
    _.forEach(this.config, (item, key) => {
      this.config[key] = config[key] || this.config[key];
    });

    /*
     * Default the first model added as the primary, but we should probably always
     * specify the "default model" in config
     */
    this.config.primary = this.config.primary || this.schema.models.entries().next().value.name;

    if (this.config.queue) {
      modelQueue = modelQueue || new ModelQueue(this.config.queue, this.config.logger);

      let defaultQueueKey = `eriksen-${this.schema.name}-${process.env.NODE_ENV}`;
      this.config.queueKey = this.config.queue.queueKey || defaultQueueKey;
    }
  }
}

module.exports = Eriksen;
