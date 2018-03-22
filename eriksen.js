'use strict';

const _ = require('lodash');
const ModelProxy = require('./lib/proxy');
const defaultConfig = {
  waitTime: 0,
  primary: null,
  queue: false,
  logger: { log: console.log, info: console.log, error: console.error }, // eslint-disable-line no-console
  hideErrorTrace: false
};

class Eriksen {
  constructor(name) {
    this.name = name;
    this.models = new Map();
    this.config = defaultConfig;
  }

  /**
   * Add a model to this marshaler's model map
   *
   * @param {string} name - name of the model, e.g. "cassandra", "aws"
   * @param {object} model - the model to be marshaled
   */
  addModel(name, model) {
    this.models.set(name, model);
  }

  /**
   * Set up the marshaler for use (after all models have been added)
   * and also sets up the model proxy
   *
   * @param {object} config
   * @param {string} config.primary - name of the primary model, must be in model map
   * @param {string|boolean} config.secondary - optional name of secondary model,
   *  must be in model map if set, or can be "falsey" to turn secondary mode off
   * @param {object} config.logger - object containing custom log, info, and error log methods
   */
  configure(config) {
    this.config = _.merge({}, this.config, config || {});

    // bow before the gods of cyclomatic complexity
    this.validateRequiredModel(this.config.primary, 'Must specify a primary model');
    this.validateOptionalModel(this.config.secondary);

    this.proxy = new ModelProxy({
      models: this.models,
      primary: this.config.primary,
      secondary: this.config.secondary || false,
      logger: this.config.logger,
      hideErrorTrace: this.config.hideErrorTrace
    });
  }

  /**
   * Utility method to make sure a model exists and
   * also is in the model map.
   *
   * @param {string} model - name of model to validate
   * @param {string} errorMessage - message to throw if model doesn't exist
   */
  validateRequiredModel(model, errorMessage) {
    if (!model) {
      throw new Error(errorMessage);
    }
    this.validateOptionalModel(model);
  }

  /**
   * Utility method to make sure a model exists in the model map
   *
   * @param {string} model - name of model to validate
   */
  validateOptionalModel(model) {
    if (model && !this.models.has(model)) {
      throw new Error(`"${model}" must have been added via addModel()`);
    }
  }
}

module.exports = Eriksen;
