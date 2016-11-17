'use strict'

const roulette = require('./random')

module.exports.getAccount = (id) => {
  return new Promise((resolve, reject) => {
    const message = `cassandra | getAccount | ${id}`
    console.log(message)
    roulette(message, resolve, reject)
  })
}

module.exports.updateAccount = (id) => {
  return updateTable1(id).then((msg) => updateTable2(id, msg))
}

const updateTable1 = (id) => {
  return new Promise((resolve, reject) => {
    const message = `cassandra | updateTable1 | ${id}`
    console.log(message)
    roulette(message, resolve, reject)
  })
}

const updateTable2 = (id, message) => {
  return new Promise((resolve, reject) => {
    message += `cassandra | updateTable2 | ${id}`
    console.log(message)
    roulette(message, resolve, reject)
  })
}
