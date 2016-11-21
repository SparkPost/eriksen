/* eslint-disable */
'use strict';

const Eriksen = require('../index');
const c_AccountModel = require('./c_accountModel'); // cassandra model
const a_AccountModel = require('./a_accountModel'); // aws model

const accountMarshal = new Eriksen('accounts');
const loops = 3;

let reads = 0;
let writes = 0;

accountMarshal.addModel('cassandra', c_AccountModel);
accountMarshal.addModel('aws', a_AccountModel);

accountMarshal.configure({
  primary: 'cassandra',
  queue: {
    host: 'localhost',
    port: 6379
  },
  logger: { log: console.log, error: console.error, info: console.log }
});

for (let i = 0; i < loops; i++) {
  setTimeout(() => accountMarshal.getAccount(i + 100).then(logRead).catch(logRead), Math.max(Math.random() * 10000, 10000));
  setTimeout(() => accountMarshal.updateAccount(i + 100).then(logWrite).catch(logWrite), Math.max(Math.random() * 10000, 10000));
}

function logRead(result) {
  console.log(`READ RESULT ${reads}/${loops} : ${result}`);
  if (++reads >= loops) {
    console.log('READS OVER');

    if (writes >= loops) {
      process.exit(0);
    }
  } else {

  }
}

function logWrite(result) {
  console.log(`WRITE RESULT ${writes}/${loops} : ${result}`);
  if (++writes >= loops) {
    console.log('WRITES OVER');

    if (reads >= loops) {
      process.exit(0);
    }
  }
}
