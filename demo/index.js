/* eslint-disable */
'use strict';

const Eriksen = require('../eriksen');
const c_AccountModel = require('./lib/c_accountModel'); // cassandra model
const a_AccountModel = require('./lib/a_accountModel'); // aws model

const accountMarshal = new Eriksen('accounts');
const loops = 3;

let reads = 1;
let writes = 1;

accountMarshal.addModel('cassandra', c_AccountModel);
accountMarshal.addModel('aws', a_AccountModel);
accountMarshal.override('updateAccount', a_AccountModel.updateAccountHook);

accountMarshal.configure({
  primary: 'cassandra',
  secondary: 'aws', //'aws', //'aws', // false or absent to disable secondary actions
  logger: { log: console.log, error: console.error, info: console.log }
});

const proxy = accountMarshal.proxy;

for (let i = 0; i < loops; i++) {
  delayCall(() => proxy.getAccount(i + 100).then(logRead).catch(logRead));
  delayCall(() => proxy.updateAccount(i + 100).then(logWrite).catch(logWrite));
}

function logRead(result) {
  console.log(`READ RESULT ${reads}/${loops} : ${result}`);
  if (++reads > loops) {
    console.log('READS OVER');

    if (writes >= loops) {
      process.exit(0);
    }
  } else {

  }
}

function logWrite(result) {
  console.log(`WRITE RESULT ${writes}/${loops} : ${result}`);
  if (++writes > loops) {
    console.log('WRITES OVER');

    if (reads >= loops) {
      process.exit(0);
    }
  }
}

function delayCall(fn) {
  setTimeout(fn, Math.max(Math.random() * 10000, 10000));
}
