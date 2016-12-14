/* eslint-disable */
'use strict';

const roulette = require('./random');

module.exports.getAccount = (id) => {
  return new Promise((resolve, reject) => {
    const message = `aws | getAccount | ${id}`;
    console.log(message);
    roulette(message, resolve, reject);
  });
};

module.exports.updateAccount = (id) => {
  return updateDynamo(id).then((msg) => updateCloudSearch(id, msg));
};

module.exports.updateAccountHook = (args, result, secondaryModel) => {
  console.log('here ye, here ye, we overrode a function call');
  console.log(args, result, secondaryModel);
};

const updateDynamo = (id) => {
  return new Promise((resolve, reject) => {
    const message = `aws | updateTable1 | ${id}`;
    console.log(message);
    roulette(message, resolve, reject);
  });
};

const updateCloudSearch = (id, message) => {
  return new Promise((resolve, reject) => {
    message += `aws | updateTable2 | ${id}`;
    console.log(message);
    roulette(message, resolve, reject);
  });
};
