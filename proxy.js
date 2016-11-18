'use strict';

const _ = require('lodash');

class ModelProxy {

  constructor(options) {
    const primary = options.models.get(options.primary);
    const methods = _.functionsIn(primary);

    _.forEach(methods, (methodName) => {
      this[methodName] = proxify(methodName, options);
    });
  }

}

module.exports = ModelProxy;

function proxify(method, options) {
  return function() {
    const args = (arguments.length === 1) ? [arguments[0]] : Array.apply(null, arguments);
    let returnValue;

    options.models.forEach((model, name) => {
      if (options.secondary && name === options.secondary && _.isFunction(model[method])) {
        model[method].apply(model, args).catch((err) => {
          options.logger.error(`[Eriksen] Captured error on secondary model: ${name}#${method}`, err);
        });
      }
      if (name === options.primary) {
        returnValue = model[method].apply(model, args);
      }
    });

    return returnValue;
  };
}
