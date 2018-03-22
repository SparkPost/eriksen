'use strict';

/**
 * Delay for some ms before continuing promise chain
 *
 * @param {number} ms - number of ms to wait before passing on result
 * @return {function} - to be passed to a .then()
 * @example
 * callPromise().then(delay(500)).then(otherStuff);
 */
module.exports = function delay(ms) {
  return (result) => new Promise((resolve) => setTimeout(() => resolve(result), ms));
};

