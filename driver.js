'use strict';

const log = console;
const Eriksen = require('./index');
const marshal = new Eriksen('accounts');

marshal.addModel('cassandra', {
  testMethod: function() {
    log.log('hello from cassandra!');
  }
});

marshal.addModel('dynamo', {
  testMethod: function(argOne) {
    log.log('hello from dynamodb!', argOne);
  }
});

marshal.testMethod('hello');

const lawyer = new Eriksen('bloop');

lawyer.addModel('cassandra', {
  varValue: 'testing',
  newMethod: function() {
    log.log('hello from cassandra111!', this.varValue);
  }
});

lawyer.addModel('dynamo', {
  newMethod: function(argOne, argTwo) {
    log.log('hello from dynamodb111!', argOne, argTwo);
  }
});

lawyer.configure({
  primary: 'cassandra',
  queue: {
    host: 'localhost',
    port: 6379,
    messageKey: 'eriksen-dev-meta',
    queueKey: 'eriksen-dev-bloop'
  },
  logger: { log: log.log, error: log.error, info: log.log }
});

const promiseModel = new Eriksen('bloop-as-promised');

promiseModel.addModel('cassandra', {
  varValue: 'testing',
  newMethod: function(argOne, argTwo) {
    return new Promise((resolve) => {
      setTimeout(() => {
        log.log('hello from delay!', argOne, argTwo);
        resolve('done-soes!');
      }, 2000);
    });
  },
  notNewMethod: function(argOne, argTwo) {
    return new Promise((resolve) => {
      setTimeout(() => {
        log.log('hello from delay for real!', argOne, argTwo);
        resolve('done!');
      }, 2000);
    });
  }
});

promiseModel.addModel('dynamo', {
  newMethod: function(argOne, argTwo) {
    log.log('hello from dynamodb111!', argOne, argTwo);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        log.log('this should be stripped!', argOne, argTwo);
        reject(new Error('not done!'));
      }, 4000);
    });
  },
  notNewMethod: function(argOne, argTwo) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        log.log('hello from delay for fake!', argOne, argTwo);
        reject(new Error('not done!'));
      }, 4000);
    });
  }
}, ['notNewMethod']);

promiseModel.configure({
  queue: {
    host: 'localhost',
    port: 6379,
    messageKey: 'eriksen-dev-meta',
    queueKey: 'eriksen-dev-bloop-as-promised'
  },
  primary: 'cassandra',
  logger: { log: log.log, error: log.error, info: log.log }
});

if (process.argv[2] === 'true') {
  setTimeout(function() {
    lawyer.setQueueState(true);
    promiseModel.setQueueState(true);
  }, 1000);
}

setTimeout(function() {
  for (let i = 0; i < 1000; i++) {
    lawyer.newMethod('yo', i);

    promiseModel.newMethod('bleep', i)
      .then(function(arg) {
        log.log('Done!', arg);
      });

    promiseModel.notNewMethod('bleeeeep', i)
      .then(function(arg) {
        log.log('Done with not new!', arg);
      });
  }
}, 3000);

if (process.argv[2] === 'true') {
  setTimeout(function() {
    lawyer.setQueueState(false);
  }, 5000);

  setTimeout(function() {
    log.log('This should now reprocess notNewMethod calls');
    promiseModel.setQueueState(false);
  }, 10000);
}
