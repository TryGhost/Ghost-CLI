/* jshint expr:true */
var expect = require('chai').expect,
    rewire = require('rewire'),
    sinon = require('sinon'),
    Promise = require('bluebird'),

    npm = rewire('../../../lib/utils/npm');

describe('Unit: npm', function () {
    var currentEnv,
        execa, reset;

    beforeEach(function () {
        currentEnv = process.env;
        process.env = {};

        execa = sinon.stub().returns(new Promise((resolve) => {resolve();}));
        reset = npm.__set__('execa', execa);
    });

    afterEach(function () {
        process.env = currentEnv;
        reset();

        execa = null;
    });

    it('spawns npm process with no arguments correctly', function () {
        var promise = npm();

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal([]);
        });
    });

    it('spawns npm process with correct arguments', function () {
        var promise = npm(['cache', 'clear']);

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal(['cache', 'clear']);
        });
    });

    it('disables npm progress bar by default', function () {
        var promise = npm();

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
        var promise = npm([], {loglevel: 'quiet', color: 'always'});

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
        var promise = npm([], {}, {cwd: 'test'});

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][2]).to.be.an('object');
            expect(execa.args[0][2].cwd).to.equal('test');
        });
    });
});
