/* jshint expr:true */
var expect = require('chai').expect,
    rewire = require('rewire'),
    sinon = require('sinon'),

    npm = rewire('../../../lib/utils/npm');

describe('Unit: npm', function () {
    var currentEnv, spawnSync, reset;

    beforeEach(function () {
        currentEnv = process.env;
        process.env = {};

        spawnSync = sinon.stub().returns({status: 0});
        reset = npm.__set__('spawnSync', spawnSync);
    });

    afterEach(function () {
        process.env = currentEnv;
        reset();

        spawnSync = null;
    });

    it('spawns npm process with no arguments correctly', function () {
        return npm().then(function () {
            expect(spawnSync.calledOnce).to.be.true;
            expect(spawnSync.args[0]).to.be.ok;
            expect(spawnSync.args[0]).to.have.lengthOf(3);
            expect(spawnSync.args[0][1]).to.deep.equal([]);
        });
    });

    it('spawns npm process with correct arguments', function () {
        return npm(['cache', 'clear']).then(function () {
            expect(spawnSync.calledOnce).to.be.true;
            expect(spawnSync.args[0]).to.be.ok;
            expect(spawnSync.args[0]).to.have.lengthOf(3);
            expect(spawnSync.args[0][1]).to.deep.equal(['cache', 'clear']);
        });
    });

    it('disables npm progress bar by default', function () {
        return npm().then(function () {
            expect(spawnSync.calledOnce).to.be.true;
            expect(spawnSync.args[0]).to.be.ok;
            expect(spawnSync.args[0]).to.have.lengthOf(3);
            expect(spawnSync.args[0][2]).to.be.an('object');
            expect(spawnSync.args[0][2].env).to.be.an('object');
            expect(spawnSync.args[0][2].env.npm_config_progress).to.be.false;
        });
    });

    it('passes npm config options correctly to environment variables', function () {
        return npm([], {loglevel: 'quiet', color: 'always'}).then(function () {
            expect(spawnSync.calledOnce).to.be.true;
            expect(spawnSync.args[0]).to.be.ok;
            expect(spawnSync.args[0]).to.have.lengthOf(3);
            expect(spawnSync.args[0][2]).to.be.an('object');
            expect(spawnSync.args[0][2].env).to.be.an('object');
            expect(spawnSync.args[0][2].env).to.deep.equal({
                npm_config_progress: false,
                npm_config_loglevel: 'quiet',
                npm_config_color: 'always'
            });
        });
    });

    it('correctly passes through options', function () {
        return npm([], {}, {cwd: 'test'}).then(function () {
            expect(spawnSync.calledOnce).to.be.true;
            expect(spawnSync.args[0]).to.be.ok;
            expect(spawnSync.args[0]).to.have.lengthOf(3);
            expect(spawnSync.args[0][2]).to.be.an('object');
            expect(spawnSync.args[0][2].cwd).to.equal('test');
        });
    });

    it('rejects with error if one is emitted', function () {
        spawnSync.returns({error: new Error('test error')});

        return npm().then(function () {
            throw new Error('npm call should throw error');
        }).catch(function (error) {
            expect(error).to.be.an('error');
            expect(error.message).to.equal('test error');
        });
    });

    it('rejects with error code if one is emitted on exit', function () {
        spawnSync.returns({status: 42}); // the answer to life, the universe, and everything

        return npm().then(function () {
            throw new Error('npm call should have thrown an error');
        }).catch(function (error) {
            expect(error).to.be.an('error');
            expect(error.message).to.equal('Npm process exited with code: 42');
        });
    });

    it('returns the npm output', function () {
        spawnSync.returns({stdout: 'test', status: 0});

        return npm().then(function (result) {
            expect(result).to.be.a('string');
            expect(result).to.equal('test');
        });
    });
});
