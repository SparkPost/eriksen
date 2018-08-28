/* eslint-disable */
'use strict';

// Import eriksen and models
const Eriksen = require('../eriksen');
const primaryModel = require('./lib/primaryModel');
const secondaryModel = require('./lib/secondaryModel');

// Instantiate eriksen with model name
const usersModel = new Eriksen('users');

// Demo config vars
const loops = 3;
let reads = 1;
let writes = 1;

// Set model names & paths
usersModel.addModel('usersModelPrimary', primaryModel);
usersModel.addModel('usersModelSecondary', secondaryModel);

// Configure eriksen
usersModel.configure({
  primary: 'usersModelPrimary', // writes & reads
  secondary: 'usersModelSecondary', // only writes, false or absent to disable secondary actions
  logger: { log: console.log, error: console.error, info: console.log }
});

const proxy = usersModel.proxy;

// Demo loop that calls model methods
for (let i = 0; i < loops; i++) {
  delayCall(() =>
    proxy
      .getUser(i + 100)
      .then(logRead)
      .catch(logRead)
  );
  delayCall(() =>
    proxy
      .updateUser(i + 100)
      .then(logWrite)
      .catch(logWrite)
  );
}

// Demo console output for reads
function logRead(result) {
  console.log(`READ RESULT ${reads}/${loops}: ${result}`);
  if (++reads > loops) {
    console.log('READS OVER');

    if (writes >= loops) {
      process.exit(0);
    }
  } else {
  }
}

// Demo console output for writes
function logWrite(result) {
  console.log(`WRITE RESULT ${writes}/${loops}: ${result}`);
  if (++writes > loops) {
    console.log('WRITES OVER');

    if (reads >= loops) {
      process.exit(0);
    }
  }
}

// Random delay
function delayCall(fn) {
  setTimeout(fn, Math.max(Math.random() * 10000, 10000));
}
