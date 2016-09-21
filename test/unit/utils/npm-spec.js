/* jshint expr:true */
var expect = require('chai').expect,
    rewire = require('rewire'),
    sinon = require('sinon'),
    stream = require('stream'),

    // Because ChildProcess is just an EventEmitter, it works
    // for unit testing on Node 0.12 (which doesn't export the ChildProcess class)
    ChildProcess = require('child_process').ChildProcess || require('events').EventEmitter,

    npm = rewire('../../../lib/utils/npm');

describe('Unit: npm', function () {
    var currentEnv,
        cp, spawn, reset;

    beforeEach(function () {
        currentEnv = process.env;
        process.env = {};

        cp = new ChildProcess();
        spawn = sinon.stub().returns(cp);
        reset = npm.__set__('spawn', spawn);
    });

    afterEach(function () {
        process.env = currentEnv;
        reset();

        cp = null;
        spawn = null;
    });

    it('spawns npm process with no arguments correctly', function () {
        var promise = npm();

        cp.emit('exit');

        return promise.then(function () {
            expect(spawn.calledOnce).to.be.true;
            expect(spawn.args[0]).to.be.ok;
            expect(spawn.args[0]).to.have.lengthOf(3);
            expect(spawn.args[0][1]).to.deep.equal([]);
        });
    });

    it('spawns npm process with correct arguments', function () {
        var promise = npm(['cache', 'clear']);

        cp.emit('exit');

        return promise.then(function () {
            expect(spawn.calledOnce).to.be.true;
            expect(spawn.args[0]).to.be.ok;
            expect(spawn.args[0]).to.have.lengthOf(3);
            expect(spawn.args[0][1]).to.deep.equal(['cache', 'clear']);
        });
    });

    it('disables npm progress bar by default', function () {
        var promise = npm();

        cp.emit('exit');

        return promise.then(function () {
            expect(spawn.calledOnce).to.be.true;
            expect(spawn.args[0]).to.be.ok;
            expect(spawn.args[0]).to.have.lengthOf(3);
            expect(spawn.args[0][2]).to.be.an('object');
            expect(spawn.args[0][2].env).to.be.an('object');
            expect(spawn.args[0][2].env.npm_config_progress).to.be.false;
        });
    });

    it('passes npm config options correctly to environment variables', function () {
        var promise = npm([], {loglevel: 'quiet', color: 'always'});

        cp.emit('exit');

        return promise.then(function () {
            expect(spawn.calledOnce).to.be.true;
            expect(spawn.args[0]).to.be.ok;
            expect(spawn.args[0]).to.have.lengthOf(3);
            expect(spawn.args[0][2]).to.be.an('object');
            expect(spawn.args[0][2].env).to.be.an('object');
            expect(spawn.args[0][2].env).to.deep.equal({
                npm_config_progress: false,
                npm_config_loglevel: 'quiet',
                npm_config_color: 'always'
            });
        });
    });

    it('correctly passes through options and excludes captureOutput', function () {
        var promise = npm([], {}, {cwd: 'test', captureOutput: false});

        cp.emit('exit');

        return promise.then(function () {
            expect(spawn.calledOnce).to.be.true;
            expect(spawn.args[0]).to.be.ok;
            expect(spawn.args[0]).to.have.lengthOf(3);
            expect(spawn.args[0][2]).to.be.an('object');
            expect(spawn.args[0][2].cwd).to.equal('test');
            expect(spawn.args[0][2].captureOutput).to.be.undefined;
        });
    });

    it('rejects with error if one is emitted', function () {
        var promise = npm();

        cp.emit('error', new Error('test error'));

        return promise.then(function () {
            throw new Error('Promise should not have resolved');
        }).catch(function (error) {
            expect(error).to.be.an('error');
            expect(error.message).to.equal('test error');
        });
    });

    it('rejects with error code if one is emitted on exit', function () {
        var promise = npm();

        cp.emit('exit', 42); // the answer to life, the universe, and everything

        return promise.then(function () {
            throw new Error('Promise should not have resolved');
        }).catch(function (code) {
            expect(code).to.not.be.an('error');
            expect(code).to.equal(42);
        });
    });

    it('correctly captures the npm output and returns it when output is a string', function () {
        var stdout = stream.Readable(),
            promise;

        stdout._read = function () { stdout.push(null); };

        cp.stdout = stdout;
        promise = npm([], {}, {captureOutput: true});

        stdout.emit('data', 'test');
        cp.emit('exit');

        return promise.then(function (output) {
            expect(output).to.be.a('string');
            expect(output).to.equal('test');
        });
    });

    it('correctly captures the npm output and returns it when output is a string', function () {
        var stdout = stream.Readable(),
            buffer = Buffer.from ? Buffer.from('test') : new Buffer('test'),
            promise;

        stdout._read = function () { stdout.push(null); };

        cp.stdout = stdout;
        promise = npm([], {}, {captureOutput: true});

        stdout.emit('data', buffer);
        cp.emit('exit');

        return promise.then(function (output) {
            expect(output).to.be.a('string');
            expect(output).to.equal('test');
        });
    });

    it('correctly returns the signal when output is off and signal is given', function () {
        var promise = npm();

        cp.emit('exit', null, 'test'); // the answer to life, the universe, and everything

        return promise.then(function (signal) {
            expect(signal).to.equal('test');
        });
    });
});
