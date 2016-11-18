'use strict';

const _ = require('lodash');
const defaultOptions = {
  models: new Map()
};

class ModelProxy {
  constructor(opts) {
    const options = _.merge({}, defaultOptions, opts || {});

    // Set primary model on options
    options.primaryModel = setupModel(options.primary, options.models);

    // Conditionally set secondary model on options
    options.secondaryModel = setupModel(options.secondary, options.models);

    if (isEqual(options.primary, options.secondary)) {
      throw new Error('Primary and secondary models cannot be the same');
    }

    const methodsToProxy = _.functionsIn(options.primaryModel);

    // Loop over primary methods and attach proxied version to this
    _.forEach(methodsToProxy, (methodName) => {
      this[methodName] = proxify(methodName, options);
    });
  }
}

module.exports = ModelProxy;

function isEqual(a, b) {
  if (typeof a === 'undefined' && typeof b === 'undefined') {
    return false;
  }
  return a === b;
}

function setupModel(name, models) {
  const model = models.get(name);

  if (name && !model) {
    throw new Error(`Must include model named "${name}" in models passed to proxy`);
  }

  return model;
}

function proxify(method, options) {
  return function() {
    const args = (arguments.length === 1) ? [arguments[0]] : Array.apply(null, arguments);

    return callMethod(options.primaryModel, method, args).then((result) => {
      if (!options.secondary || !_.isFunction(options.secondaryModel[method])) {
        return result;
      }

      // don't return here and swallow errors so that secondary call is non-blocking
      callMethod(options.secondaryModel, method, args).catch((err) => {
        options.logger.error(`[Eriksen] Captured error on secondary model: ${options.secondary}#${method}`, err);
      });

      return result;
    });
  };
}

function callMethod(model, method, args) {
  return model[method].apply(model, args);
}
