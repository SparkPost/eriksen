'use strict';
let _ = require('lodash')
  , ModelQueue = require('./lib/queue')
  , ModelProxy = require('./lib/proxy')
  , modelQueue = { queue: { rpush: () => {}}}
  , schemas = {};

class Eriksen {
  constructor(schema) {
    schemas[schema] = new ModelProxy({
      name: schema,
      queue: modelQueue,
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
      if (modelQueue instanceof ModelQueue === false) {
        modelQueue = new ModelQueue(this.config.queue, this.config.logger, schemas);
      }

      let defaultQueueKey = `eriksen-${this.schema.name}-${process.env.NODE_ENV}`;
      this.config.queueKey = this.config.queue.queueKey || defaultQueueKey;
    }
  }
}

module.exports = Eriksen;
