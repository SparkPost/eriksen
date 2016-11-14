'use strict';

const sinon = require('sinon');
const expect = require('chai').expect;
const proxyquire = require('proxyquire');

describe('Queue', () => {
  var sandbox, redis, schemas, Queue, logStub, queue;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    schemas = {};
    redis = require('./helpers/redis');
    Queue = proxyquire('../../lib/queue', { redis: redis.redis });

    logStub = { log: sinon.stub(), error: sinon.stub() };
    queue = new Queue({}, logStub, schemas);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should be able to instantiate the queue with error handlers', (done) => {
    queue.subscriber.on('error', function() {
      expect(logStub.error).to.have.been.called;
      done();
    });

    queue.subscriber.emit('error', 'a test error');
  });

  it('should be able to subscribe to the queue on instantiation', () => {
    expect(logStub.log).to.have.been.called;
  });

  it('should be able to transition queue to active', () => {
    schemas.test = {
      schema: {
        queueInProgress: false
      }
    };

    queue.subscriber.emit('message', ['test', JSON.stringify({
      model: 'test',
      queue: true
    })]);

    expect(schemas.test.schema.queueInProgress).to.be.true;
  });

  it('should be able to transition queue from active to inactive', () => {
    queue.drainQueue = () => {
      return new Promise((resolve) => {
        resolve(10);
      });
    };

    schemas.test = {
      schema: {
        queueInProgress: true
      }
    };

    return queue.handleQueueTransition('test', JSON.stringify({
      model: 'test',
      queue: false
    }))
    .then(() => {
      expect(schemas.test.schema.queueInProgress).to.be.false;
    });
  });

  it('should handle errors from the queue-handler backend', () => {
    queue.drainQueue = () => {
      return new Promise((resolve, reject) => {
        reject(new Error());
      });
    };

    schemas.test = {
      schema: {
        queueInProgress: true
      }
    };

    return queue.handleQueueTransition('test', JSON.stringify({
      model: 'test',
      queue: false
    }))
    .catch(() => {
      expect(logStub.error).to.have.been.called;
      expect(schemas.test.schema.queueInProgress).to.be.true;
    });
  });

  it('should warn when a queue transition is attempted on an non-defined model', () => {
    schemas.test = {
      schema: {
        queueInProgress: false
      }
    };

    queue.subscriber.emit('message', ['test', JSON.stringify({
      model: 'non-test',
      queue: false
    })]);

    expect(logStub.error).to.have.been.called;
  });

  it('should be able to work through a queue backlog and return a count', () => {
    schemas.test = {
      schema: {
        config: {
          queueKey: 'test'
        },
        queueInProgress: true
      }
    };

    queue.getAllQueued = () => {
      return new Promise((resolve) => {
        resolve([
          new Promise((resolve) => { resolve(); }),
          new Promise((resolve) => { resolve(); }),
          new Promise((resolve) => { resolve(); })
        ]);
      });
    };

    return queue.drainQueue('test')
      .then((count) => {
        expect(count).to.equal(3);
      });
  });

  it('should reject when an issue has been encountered with fetching from the queue', () => {
    schemas.test = {
      schema: {
        config: {
          queueKey: 'test'
        },
        queueInProgress: true
      }
    };

    queue.getAllQueued = () => {
      return new Promise((resolve) => {
        resolve([
          new Promise((resolve) => { resolve(); }),
          new Promise((resolve, reject) => { reject(new Error()); }),
          new Promise((resolve) => { resolve(); })
        ]);
      });
    };

    return queue.drainQueue('test')
      .catch((err) => {
        expect(err).not.to.be.undefined;
      });
  });

  it('should allow for retrieving a list of queued messages', () => {
    schemas.test = {
      schema: {
        config: {
          logger: logStub,
          queueKey: 'test'
        },
        queueInProgress: true
      },
      isSecondary: (test) => { return test.test === true; },
      models: new Map([
        ['test', { test: true, model: { test: sinon.stub() }}],
        ['untest', { model: { test: sinon.stub().resolves() }}]
      ])
    };

    queue.getQueuedMessage = sinon.stub();

    for (let i = 0; i < 5; i++) {
      queue.getQueuedMessage.onCall(i).resolves(JSON.stringify({
        func: 'test',
        model: 'test',
        args: [i]
      }));
    }

    queue.getQueuedMessage.onCall(5).resolves(null);
    schemas.test.models.get('test').model.test.onCall(3).rejects(new Error());

    let modelPromises = [];
    return queue.getAllQueued('test', 'test', modelPromises)
      .then((allCalls) => {
        expect(allCalls.length).to.equal(5);
        expect(allCalls[3]).to.have.resolved;
        expect(logStub.error).to.have.been.called;
      });
  });

  it('should allow for getting a single queued message', () => {
    queue.queue.lpop.callsArgWith(1, null, 'testing!');

    return queue.getQueuedMessage('test')
      .then((message) => {
        expect(message).to.equal('testing!');
      });
  });

  it('should reject during failure to get a queued message', () => {
    queue.queue.lpop.callsArgWith(1, new Error());

    return queue.getQueuedMessage('test')
      .catch((err) => {
        expect(err instanceof Error).to.equal(true);
      });
  });

  it('should allow for setting the queue state without submitting a redis message', () => {
    queue.setQueueState(true, 'test');

    expect(queue.queue.publish.lastCall.args[0]).to.equal('eriksen-metadata');
    expect(queue.queue.publish.lastCall.args[1]).to.equal('{"queue":true,"model":"test"}');
  });
});
