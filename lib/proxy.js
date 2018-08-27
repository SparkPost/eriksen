'use strict';

const _ = require('lodash');
const defaultOptions = {
  models: new Map()
};

class ModelProxy {
  /**
   * @param {object} opts
   * @param {Map} opts.models - Map of the model objects
   * @param {string} opts.primary - name of the primary model
   * @param {string|boolean} opts.secondary - name of the secondary model or false if no secondary
   * @param {object} opts.logger - log object (log, info, error)
   */
  constructor(opts) {
    const options = _.merge({}, defaultOptions, opts || {});

    // Set primary model on options
    options.primaryModel = setupModel(options.primary, options.models);

    // Conditionally set secondary model on options
    options.secondaryModel = setupModel(options.secondary, options.models);

    // Fail if primary and secondary are accidentally the same
    if (isEqual(options.primary, options.secondary)) {
      throw new Error('Primary and secondary models cannot be the same');
    }

    // Get methods from own and inherited enumerable properties on primaryModel
    let methodsToProxy;

    const functions = _.attempt(() =>
      Object.getOwnPropertyNames(Object.getPrototypeOf(options.primaryModel))
    ); // gets function names for ES6 classes
    if (!_.isError(functions)) {
      methodsToProxy = functions;
    }

    methodsToProxy = _.union(
      _.functionsIn(options.primaryModel),
      methodsToProxy
    );

    // Loop over primary methods and attach proxied version to this
    _.forEach(methodsToProxy, (methodName) => {
      this[methodName] = proxify(methodName, options);
    });
  }
}

module.exports = ModelProxy;

/**
 * Test if 2 items are equal, but only if they are NOT both undefined
 *
 * @param {*} a
 * @param {*} b
 * @return {boolean}
 */
function isEqual(a, b) {
  if (typeof a === 'undefined' && typeof b === 'undefined') {
    return false;
  }
  return a === b;
}

/**
 * Get a model out of the model map, and throw an error if it doesn't exist
 *
 * @param {string} name - name of the model to get
 * @param {Map} models - map to get model from
 *
 * @return {object} - the extracted model
 */
function setupModel(name, models) {
  const model = models.get(name);

  if (name && !model) {
    throw new Error(
      `Must include model named "${name}" in models passed to proxy`
    );
  }

  return model;
}

/**
 * Create a new function that calls primary model method, and conditionally, the secondary
 *
 * @param {string} method - name of the method to proxy
 * @param {object} options
 * @param {string} options.primary - name of the primary model
 * @param {object} options.primaryModel - primary model object
 * @param {string|boolean} options.secondary - name of the secondary model or false if no secondary
 * @param {object|undefined} options.secondaryModel - secondary model object or undefined if no secondary
 * @param {object} options.logger - object with log, info, error log functions
 *
 * @return {function} new proxied function
 */
function proxify(method, options) {
  return function proxified(...params) {
    const args = params.length === 1 ? [params[0]] : Array(...params);

    return callMethod(options.primaryModel, method, args).then((result) => {
      if (!options.secondary || !_.isFunction(options.secondaryModel[method])) {
        return result;
      }

      // don't return here and swallow errors so that secondary call is non-blocking
      callMethod(options.secondaryModel, method, args).catch((err) => {
        const userError = options.hideErrorTrace ? `${err}` : err;
        options.logger.error(
          `[Eriksen] [t=${new Date().toISOString()}] Captured error on secondary model: ${
            options.secondary
          }#${method}`,
          userError
        );
      });

      return result;
    });
  };
}

function callMethod(model, method, args) {
  return model[method](...args);
}
