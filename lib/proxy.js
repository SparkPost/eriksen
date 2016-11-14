'use strict';

let _ = require('lodash');

class ModelProxy {
  constructor(conf) {
    this.name = conf.name;
    this.models = new Map();
    this.schema = conf.schema;
    this.config = conf.config;
    this._cache = new Map();

    this.queue = conf.queue;
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
    if (this.isSecondary(model) && this.schema.queueInProgress) {
      this.schema.config.logger.log(`[Eriksen] Logging write to ${this.schema.config.queueKey}`);
      return this.queue.queue.rpush(this.schema.config.queueKey, JSON.stringify({
        schema: this.name,
        model: model.name,
        func: func,
        args: funcArgs,
        datetime: new Date().toISOString()
      }));
    }

    let modelReturn = model.model[func].apply(model.model, funcArgs);

    /* If the model method returned a promise, and if this model is not the primary
      * model, THEN we should swallow the error and use the configured logger to output
      * an error
      */
    if (modelReturn instanceof Promise && this.isSecondary(model)) {
      modelReturn = modelReturn.catch((e) => {
        this.schema.config.logger.error('[Eriksen] Captured error on secondary model', e);
      });
    }

    return modelReturn;
  }
}

module.exports = ModelProxy;
