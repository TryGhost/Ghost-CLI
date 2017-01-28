'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');

let npm;

describe('Unit: npm', function () {
    let currentEnv;
    let execa;

    beforeEach(function () {
        currentEnv = process.env;
        process.env = {};

        execa = sinon.stub().returns(new Promise((resolve) => {resolve();}));
        npm = proxyquire('../../../lib/utils/npm', {
            execa: execa
        });
    });

    afterEach(function () {
        process.env = currentEnv;
    });

    it('spawns npm process with no arguments correctly', function () {
        let promise = npm();

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal([]);
        });
    });

    it('spawns npm process with correct arguments', function () {
        let promise = npm(['cache', 'clear']);

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal(['cache', 'clear']);
        });
    });

    it('disables npm progress bar by default', function () {
        let promise = npm();

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][2]).to.be.an('object');
            expect(execa.args[0][2].env).to.be.an('object');
            expect(execa.args[0][2].env.npm_config_progress).to.be.false;
        });
    });

    it('passes npm config options correctly to environment variables', function () {
        let promise = npm([], {loglevel: 'quiet', color: 'always'});

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][2]).to.be.an('object');
            expect(execa.args[0][2].env).to.be.an('object');
            expect(execa.args[0][2].env).to.deep.equal({
                npm_config_progress: false,
                npm_config_loglevel: 'quiet',
                npm_config_color: 'always'
            });
        });
    });

    it('correctly passes through options', function () {
        let promise = npm([], {}, {cwd: 'test'});

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][2]).to.be.an('object');
            expect(execa.args[0][2].cwd).to.equal('test');
        });
    });
});
