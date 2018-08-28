/* eslint-disable */
'use strict';

/**
 * Helper function for demo that sets a random timeout to resolve or reject
 * when compared against the failThreshold param.
 *
 * @param {string} message - message to resolve or reject with
 * @param {function(string)} resolve
 * @param {function(string)} reject
 * @param {number} [failThreshold=0.2] - time limit under which to fail db operation
 *
 * @return {undefined}
 */
module.exports = (message, resolve, reject, failThreshold) => {
  const timeout = Math.max(Math.random() * 10000, 3000); // 0 - 3000 ms
  failThreshold = failThreshold || 0.2;
  setTimeout(() => {
    if (Math.random() < failThreshold) {
      reject(new Error(message));
      return;
    }
    resolve(message);
  }, timeout);
};
