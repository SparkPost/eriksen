'use strict'

module.exports = (message, resolve, reject, failThreshold) => {
  const timeout = Math.max(Math.random() * 10000, 3000) // 0 - 3000 ms
  failThreshold = failThreshold || 0.2
  setTimeout(() => {
    if (Math.random() < failThreshold) {
      reject(new Error(message))
      return
    }
    resolve(message)
  }, timeout)
}
