'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');

let yarn;

describe('Unit: yarn', function () {
    let currentEnv;
    let execa;

    beforeEach(function () {
        currentEnv = process.env;
        process.env = {};

        execa = sinon.stub().returns(new Promise((resolve) => {resolve();}));
        yarn = proxyquire('../../../lib/utils/yarn', {
            execa: execa
        });
    });

    afterEach(function () {
        process.env = currentEnv;
    });

    it('spawns yarn process with no arguments correctly', function () {
        let promise = yarn();

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal([]);
        });
    });

    it('spawns yarn process with correct arguments', function () {
        let promise = yarn(['cache', 'clear']);

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal(['cache', 'clear']);
        });
    });

    it('correctly passes through options', function () {
        let promise = yarn([], {cwd: 'test'});

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][2]).to.be.an('object');
            expect(execa.args[0][2].cwd).to.equal('test');
        });
    });
});
