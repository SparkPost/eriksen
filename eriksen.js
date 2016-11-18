'use strict';

const _ = require('lodash');
const ModelProxy = require('./lib/proxy');
const defaultConfig = {
  waitTime: 0,
  primary: null,
  queue: false,
  logger: { log: console.log, info: console.log, error: console.error } // eslint-disable-line no-console
};

class Eriksen {
  constructor(name) {
    console.log(`New Eriksen created (${name})`); // eslint-disable-line no-console
    this.name = name;
    this.models = new Map();
    this.config = defaultConfig;
  }

  addModel(name, model) {
    this.models.set(name, model);
  }

  configure(config) {
    this.config = _.merge({}, this.config, config || {});

    // bow before the gods of cyclomatic complexity
    this.validateRequiredModel(this.config.primary, 'Must specify a primary model');
    this.validateOptionalModel(this.config.secondary);

    this.proxy = new ModelProxy({
      // schema: this.name,
      models: this.models,
      primary: this.config.primary,
      secondary: this.config.secondary || false,
      logger: this.config.logger
    });
  }

  validateRequiredModel(model, errorMessage) {
    if (!model) {
      throw new Error(errorMessage);
    }
    this.validateOptionalModel(model);
  }

  validateOptionalModel(model) {
    if (model && !this.models.has(model)) {
      throw new Error(`"${model}" must have been added via addModel()`);
    }
  }
}

module.exports = Eriksen;
