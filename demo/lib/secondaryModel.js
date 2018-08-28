/* eslint-disable */
'use strict';

// Demo utility function that resolves or rejects randomly
const roulette = require('./roulette');

// Secondary Read
module.exports.getUser = (id) => {
  return new Promise((resolve, reject) => {
    console.log(`Secondary performing getUser(${id})`);
    roulette(`Secondary getUser(${id}) (not returned)`, resolve, reject);
  });
};

// Secondary Write, performs 2 update actions
module.exports.updateUser = (id) => {
  const message = 'Secondary ';
  return updateAction1(id, message).then((msg) => updateAction2(id, msg));
};

const updateAction1 = (id, message) => {
  return new Promise((resolve, reject) => {
    console.log(`Secondary performing updateAction1(${id})`);
    message += `updateAction1(${id})`;
    roulette(message, resolve, reject);
  });
};

const updateAction2 = (id, message) => {
  return new Promise((resolve, reject) => {
    console.log(`Secondary performing updateAction2(${id})`);
    message += ` + updateAction2(${id})`;
    roulette(message, resolve, reject);
  });
};
