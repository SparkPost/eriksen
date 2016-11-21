'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const delay = require('../delay');
const Eriksen = require('../../eriksen');

chai.use(require('sinon-chai'));

describe('model marshaling process', function() {

  let storeA
    , storeB
    , modelA
    , modelB;

  beforeEach(function() {
    storeA = {};
    storeB = {};
    modelA = {
      update: (key, value) => {
        storeA[key] = `a: ${value}`;
        return Promise.resolve('a updated');
      },
      get: (key) => Promise.resolve(storeA[key]),
      onlyA: () => Promise.resolve('a')
    };
    modelB = {
      update: (key, value) => {
        storeB[key] = `b: ${value}`;
        return Promise.resolve('b updated');
      },
      get: (key) => Promise.resolve(storeB[key]),
      onlyB: () => Promise.resolve('b')
    };
  });

  it('should perform dual writes and single primary reads', function() {
    const marshal = new Eriksen('regular');
    marshal.addModel('a', modelA);
    marshal.addModel('b', modelB);

    marshal.configure({
      primary: 'a',
      secondary: 'b'
    });

    return marshal.proxy.update('fruit', 'banana')
      .then((result) => {
        expect(result).to.equal('a updated');
        return marshal.proxy.get('fruit');
      })
      .then((result) => {
        expect(result).to.equal('a: banana');
        expect(storeB.fruit).to.equal('b: banana');
      });
  });

  it('should only perform primary reads and writes if secondary is false', function() {
    const marshal = new Eriksen('primary-only');
    marshal.addModel('a', modelA);
    marshal.addModel('b', modelB);

    marshal.configure({
      primary: 'a',
      secondary: false
    });

    return marshal.proxy.update('sandwich', 'hotdog')
      .then((result) => {
        expect(result).to.equal('a updated');
        expect(storeA.sandwich).to.equal('a: hotdog');
        expect(storeB.sandwich).to.be.undefined;
      });
  });

  it('should only perform primary reads and writes if secondary method doesn\'t exist', function() {
    const marshal = new Eriksen('secondary-method-missing');

    delete modelB.update;

    marshal.addModel('a', modelA);
    marshal.addModel('b', modelB);
    marshal.configure({ primary: 'a', secondary: 'b' });

    return marshal.proxy.update('color', 'purple')
      .then((result) => {
        expect(result).to.equal('a updated');
        expect(storeA.color).to.equal('a: purple');
        expect(storeB.color).to.be.undefined;
      });
  });

  it('should log if secondary write fails', function() {
    const logStub = { error: sinon.stub() };
    const secondaryError = new Error();
    const marshal = new Eriksen('secondary-failure');

    modelB.get = sinon.stub().rejects(secondaryError);

    marshal.addModel('a', modelA);
    marshal.addModel('b', modelB);
    marshal.configure({ primary: 'a', secondary: 'b', logger: logStub });

    return marshal.proxy.get('nothing')
      .then(delay(500))
      .then((result) => {
        expect(result).to.be.undefined;
        expect(logStub.error).to.have.been.calledWith('[Eriksen] Captured error on secondary model: b#get', secondaryError);
      });
  });

  it('shouldn\'t wait for the secondary write to complete before returning', function() {
    const marshal = new Eriksen('secondary-slow');

    modelB.update = function(key, value) {
      return delay(1000)().then(() => {
        storeB[key] = `b: ${value}`;
        return 'b updated slow';
      });
    };

    marshal.addModel('a', modelA);
    marshal.addModel('b', modelB);
    marshal.configure({ primary: 'a', secondary: 'b' });

    return marshal.proxy.update('food', 'molasses')
      .then((result) => {
        expect(result).to.equal('a updated');
        expect(storeA.food).to.equal('a: molasses');
        expect(storeB.food).to.be.undefined;
      })
      .then(delay(1500)) // wait for secondary write to complete
      .then(() => {
        expect(storeB.food).to.equal('b: molasses');
      });
  });

});
