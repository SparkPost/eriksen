'use strict';

const _ = require('lodash');
const ModelProxy = require('./lib/proxy');
const defaultConfig = {
  waitTime: 0,
  primary: null,
  queue: false,
  logger: { log: () => {}, info: () => {}, error: () => {} }
};

class Eriksen {
  constructor(name) {
    console.log(`New Eriksen created (${name})`);
    this.name = name;
    this.models = new Map();
    this.config = defaultConfig;
  }

  addModel(name, model) {
    this.models.set(name, model);
  }

  configure(config) {
    this.config = _.merge({}, this.config, config);

    if (!this.config.primary) {
      throw new Error(`Must specify a primary model`);
    }

    if (!this.models.has(this.config.primary)) {
      throw new Error(`Primary model must have been added via addModel()`);
    }

    if (this.config.secondary && !this.models.has(this.config.secondary)) {
      this.config.secondary = false;
    }

    this.proxy = new ModelProxy({
      models: this.models,
      primary: this.config.primary,
      secondary: this.config.secondary || false
    });
  }
}

module.exports = Eriksen;
