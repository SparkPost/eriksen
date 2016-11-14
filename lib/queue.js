'use strict';

let redis = require('redis');

class ModelQueue {
  constructor(config, logger, schemas) {
    this.config = config;
    this.config.queueTransitionKey = this.config.queueTransitionKey || 'eriksen-metadata';

    this.queue = redis.createClient(config.queue);
    this.subscriber = this.queue.duplicate();

    this.schemas = schemas;

    let errorHandler = (err) => {
      logger.error('[Eriksen] Error from Redis', err);
    };

    this.log = logger;

    this.queue.on('error', errorHandler);
    this.subscriber.on('error', errorHandler);

    this.subscriber.on('message', (channel, message) => { this.handleQueueTransition(channel, message); });
    this.subscriber.on('subscribe', (channel, message) => { this.handleMetadataSubscription(channel, message); });

    this.subscriber.subscribe(this.config.queueTransitionKey);
  }

  handleMetadataSubscription(channel) {
    this.log.log('[Eriksen] subscribed to channel: ', channel);
  }

  handleQueueTransition(channel, message) {
    message = JSON.parse(message);
    this.log.log(`[Eriksen] transitioning queue state for ${message.model} to ${message.queue}`);

    if (message.model in this.schemas) {
      // If we were queueing, and then we received the command to flush, drain the queue
      if (this.schemas[message.model].schema.queueInProgress === true && message.queue === false) {
        return this.drainQueue(message.model)
          .then((count) => {
            this.schemas[message.model].schema.queueInProgress = message.queue;
            this.log.log(`[Eriksen] Re-processed all ${count} messages for schema ${message.model}.`);
          })
          .catch((err) => {
            this.log.error('[Eriksen] Problem with reprocessing', err);
          });
      } else {
        this.schemas[message.model].schema.queueInProgress = message.queue;
      }
    } else {
      this.log.error(`[Eriksen] No existing model of type "${message.model}"`);
    }
  }

  drainQueue(model) {
    let queueKey = this.schemas[model].schema.config.queueKey
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
        this.schemas[model].models.forEach((backend) => {
          if (this.schemas[model].isSecondary(backend)) {
            let functionPromise = backend.model[message.func].apply(backend.model, message.args);

            modelCallPromises.push(
              Promise.resolve(functionPromise)
                .catch((err) => {
                  this.schemas[model].schema.config.logger.error('[Eriksen] Error during reprocessing:', err);
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

  setQueueState(shouldQueue, queueTransitionKey) {
    this.queue.publish(this.config.queueTransitionKey, JSON.stringify({ queue: shouldQueue, model: queueTransitionKey }));
  }
}

module.exports = ModelQueue;
