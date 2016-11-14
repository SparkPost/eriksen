'use strict';
const sinon = require('sinon');

class RedisClientStub {
  constructor() {
    this.handlers = new Map();

    return {
      lpop: sinon.stub(),
      publish: sinon.stub(),
      duplicate: () => {
        return new RedisClientStub();
      },
      subscribe: function(key) {
        this.emit('subscribe', [key, 'test-channel']);
      },
      on: function(type, handler) {
        this.handlers = this.handlers || {};
        this.handlers[type] = this.handlers[type] || [];
        this.handlers[type].push(handler);
      },
      emit: function(event, data) {
        if (event in this.handlers) {
          this.handlers[event].forEach((handler) => {
            handler.apply(handler, Array.isArray(data) ? data : [data]);
          });
        }
      }
    };
  }
}

const redisStub = {
  createClient: sinon.stub().returns(new RedisClientStub())
};

module.exports = {
  redis: redisStub,
  redisClient: RedisClientStub
};
