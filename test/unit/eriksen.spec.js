'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

chai.use(require('sinon-chai'));

describe('Eriksen marshaler', () => {
  let ProxyMock, Eriksen, marshal;

  beforeEach(() => {
    ProxyMock = sinon.stub();
    Eriksen = proxyquire('../../eriksen', { './lib/proxy': ProxyMock });
    marshal = new Eriksen('burgers');
  });

  it('should set up with default values and config', () => {
    expect(marshal.name).to.equal('burgers');
    expect(marshal.models).to.be.an.instanceof(Map);
    expect(marshal.config).to.be.an('object');
    expect(marshal.config.primary).to.be.null;
    expect(marshal.config.logger.log).to.be.a('function');
    expect(marshal.config.logger.info).to.be.a('function');
    expect(marshal.config.logger.error).to.be.a('function');
  });

  it('should add models by name', () => {
    const modelA = {};
    const modelB = {};
    marshal.addModel('a', modelA);
    marshal.addModel('b', modelB);

    expect(marshal.models.size).to.equal(2);
    expect(marshal.models.get('a')).to.equal(modelA);
    expect(marshal.models.get('b')).to.equal(modelB);
  });

  it('should only add a model once, preferring the latest addition', () => {
    const modelA1 = {};
    const modelA2 = {};

    marshal.addModel('a', modelA1);
    marshal.addModel('a', modelA2);

    expect(marshal.models.size).to.equal(1);
    expect(marshal.models.get('a')).to.equal(modelA2);
  });

  it('should configure and set up a proxy', () => {
    marshal.addModel('a', {});
    marshal.configure({
      primary: 'a',
      secondary: false
    });

    expect(ProxyMock).to.have.been.calledWith({
      models: marshal.models,
      primary: 'a',
      secondary: false,
      logger: marshal.config.logger,
      hideErrorTrace: false
    });
  });

  it('should throw an error if primary is not set', () => {
    expect(() => marshal.configure()).to.throw('Must specify a primary model');
  });

  it('should throw an error if primary has not been added', () => {
    expect(() => marshal.configure({ primary: 'whatev' })).to.throw(
      '"whatev" must have been added via addModel()'
    );
  });

  it('should throw an error if secondary is set, but has not been added', () => {
    marshal.addModel('a', {});
    expect(() => marshal.configure({ primary: 'a', secondary: 'b' })).to.throw(
      '"b" must have been added via addModel()'
    );
  });

  it('should not mind if secondary is not set at all', () => {
    marshal.addModel('a', {});
    marshal.configure({
      primary: 'a'
    });

    expect(ProxyMock).to.have.been.calledWith({
      models: marshal.models,
      primary: 'a',
      secondary: false,
      logger: marshal.config.logger,
      hideErrorTrace: false
    });
  });
});
