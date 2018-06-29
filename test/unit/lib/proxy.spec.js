'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const ModelProxy = require('../../../lib/proxy');

chai.use(require('sinon-chai'));

(['model', 'class']).forEach((model) => {
  describe(`Model proxy service for a [${model}]`, () => {

    let models
      , modelA
      , modelB
      , clock;

    const delay = (ms) => {
      clock.tick(ms);
    };


    beforeEach(() => {
      const currentDate = new Date('2018-03-21T07:52:26-05:00');
      clock = sinon.useFakeTimers(currentDate.getTime());
      modelA = {
        get: sinon.stub().resolves('a'),
        update: sinon.stub().resolves('a'),
        onlyA: sinon.stub().resolves('a')
      };
      modelB = {
        get: sinon.stub().resolves('b'),
        update: sinon.stub().resolves('b'),
        onlyB: sinon.stub().resolves('b')
      };

      class ModelAsClass {
        get() {
        }

        update() {
        }
      }

      class ModelAsClassA extends ModelAsClass {
        onlyA() {
        }
      }

      class ModelAsClassB extends ModelAsClass {
        onlyB() {
        }
      }

      sinon.stub(ModelAsClassA.prototype, 'get').resolves('a');
      sinon.stub(ModelAsClassB.prototype, 'get').resolves('b');
      sinon.stub(ModelAsClassA.prototype, 'update').resolves('a');
      sinon.stub(ModelAsClassB.prototype, 'update').resolves('b');
      sinon.stub(ModelAsClassA.prototype, 'onlyA').resolves('a');
      sinon.stub(ModelAsClassB.prototype, 'onlyB').resolves('b');

      modelA = model === 'class' ? new ModelAsClassA() : modelA;
      modelB = model === 'class' ? new ModelAsClassB() : modelB;

      models = new Map();
      models.set('a', modelA);
      models.set('b', modelB);
    });

    afterEach(() => {
      clock.restore();
    });

    it('should instantiate a proxy object based on the primary model', () => {
      const proxy = new ModelProxy({
        models: models,
        primary: 'a',
        secondary: 'b'
      });
      expect(proxy.get).to.be.a('function');
      expect(proxy.update).to.be.a('function');
      expect(proxy.onlyA).to.be.a('function');
      expect(proxy.onlyB).to.not.exist;
    });

    it('should instantiate an object with no proxied methods if no config is passed', () => {
      const proxy = new ModelProxy();
      expect(proxy.get).to.not.exist;
      expect(proxy.update).to.not.exist;
      expect(proxy.onlyA).to.not.exist;
      expect(proxy.onlyB).to.not.exist;
    });

    it('should call both primary and secondary methods', () => {
      const proxy = new ModelProxy({
        models: models,
        primary: 'a',
        secondary: 'b'
      });

      return proxy.get(123).then(delay(500)) // delay to wait for async secondary call (:crossedfingers:)
        .then((result) => {
          expect(result).to.equal('a');
          expect(modelA.get).to.have.been.calledWith(123);
          expect(modelB.get).to.have.been.calledWith(123);
        });
    });

    it('should return the correct result if the primary is switched', () => {
      const proxy = new ModelProxy({
        models: models,
        primary: 'b',
        secondary: 'a'
      });

      return proxy.get(123).then(delay(500)) // delay to wait for async secondary call (:crossedfingers:)
        .then((result) => {
          expect(result).to.equal('b');
          expect(modelA.get).to.have.been.calledWith(123);
          expect(modelB.get).to.have.been.calledWith(123);
        });
    });

    it('should throw an error if primary and secondary are the same', () => {
      expect(() => new ModelProxy({
        models: models,
        primary: 'a',
        secondary: 'a'
      })).to.throw('Primary and secondary models cannot be the same');
    });

    it('should throw an error if primary is not in models', () => {
      expect(() => new ModelProxy({
        models: models,
        primary: 'primary not here'
      })).to.throw('Must include model named "primary not here" in models passed to proxy');
    });

    it('should throw an error if secondary is not in models', () => {
      expect(() => new ModelProxy({
        models: models,
        primary: 'a',
        secondary: 'secondary not here'
      })).to.throw('Must include model named "secondary not here" in models passed to proxy');
    });

    it('should only call primary method if secondary mode is false', () => {
      const proxy = new ModelProxy({
        models: models,
        primary: 'a',
        secondary: false
      });

      return proxy.get().then(delay(500))
        .then((result) => {
          expect(result).to.equal('a');
          expect(modelA.get).to.have.been.called;
          expect(modelB.get).not.to.have.been.called;
        });
    });

    it('should skip a secondary call if method doesn\'t exist on secondary model', () => {
      const proxy = new ModelProxy({
        models: models,
        primary: 'a',
        secondary: 'b'
      });

      return proxy.onlyA().then(delay(500))
        .then((result) => {
          expect(result).to.equal('a');
          expect(modelA.onlyA).to.have.been.called;
        });
    });

    it('should return successfully but log if secondary call fails', () => {
      const logStub = sinon.stub();
      const testError = new Error('noooope');
      const proxy = new ModelProxy({
        models: models,
        primary: 'a',
        secondary: 'b',
        logger: {error: logStub}
      });

      modelB.update.rejects(testError);

      return proxy.update().then(delay(500))
        .then((result) => {
          expect(result).to.equal('a');
          expect(modelA.update).to.have.been.called;
          expect(modelB.update).to.have.been.called;
          expect(logStub).to.have.been.calledWith('[Eriksen] [t=2018-03-21T12:52:26.500Z] Captured error on secondary model: b#update', testError);
        });
    });

    it('should hide error trace when option passed in and secondary fails', () => {
      const logStub = sinon.stub();
      const testError = new Error('noooope');
      const proxy = new ModelProxy({
        models: models,
        primary: 'a',
        secondary: 'b',
        hideErrorTrace: true,
        logger: {error: logStub}
      });

      modelB.update.rejects(testError);

      return proxy.update().then(delay(500))
        .then((result) => {
          expect(result).to.equal('a');
          expect(modelA.update).to.have.been.called;
          expect(modelB.update).to.have.been.called;
          expect(logStub).to.have.been.calledWith('[Eriksen] [t=2018-03-21T12:52:26.500Z] Captured error on secondary model: b#update', `Error: ${testError.message}`);
        });

    });

    it('should fail if the primary call fails', () => {
      const testError = new Error('noooope');
      const proxy = new ModelProxy({
        models: models,
        primary: 'a',
        secondary: 'b'
      });
      const unexpectedSuccess = () => {
        throw new Error('Promise succeeded when it should have failed');
      };
      const expectedFail = (err) => {
        expect(err).to.equal(testError);
        expect(modelA.update).to.have.been.called;
        expect(modelB.update).to.not.have.been.called;
      };

      modelA.update.rejects(testError);
      return proxy.update().then(unexpectedSuccess, expectedFail);
    });
  });

});
