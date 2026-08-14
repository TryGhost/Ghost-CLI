'use strict';
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const {stripVTControlCharacters: stripAnsi} = require('util');

const modulePath = '../../../lib/commands/version';

describe('Unit: Commands > Version', function () {
    it('only outputs ghost-cli version if not run in a ghost folder', function () {
        const VersionCommand = require(modulePath);
        const logStub = sinon.stub();
        const getInstanceStub = sinon.stub().returns({version: null});
        const cliVersion = '1.0.0';
        const instance = new VersionCommand({log: logStub}, {getInstance: getInstanceStub, cliVersion: cliVersion});

        instance.run();
        expect(logStub.calledOnce).to.be.true;
        expect(stripAnsi(logStub.args[0][0])).to.match(/Ghost-CLI version: 1\.0\.0/);
        expect(getInstanceStub.calledOnce).to.be.true;
    });

    it('outputs both ghost-cli and ghost version if run in a ghost install folder', function () {
        const homedirStub = sinon.stub().returns('/var/www');
        const logStub = sinon.stub();
        const getInstanceStub = sinon.stub().returns({version: '1.5.0', dir: '/var/www/ghost'});
        const cliVersion = '1.0.0';
        const VersionCommand = proxyquire(modulePath, {
            os: {homedir: homedirStub}
        });
        const instance = new VersionCommand({log: logStub}, {getInstance: getInstanceStub, cliVersion: cliVersion});

        instance.run();
        expect(logStub.calledTwice).to.be.true;
        expect(stripAnsi(logStub.args[0][0])).to.match(/Ghost-CLI version: 1\.0\.0/);
        expect(stripAnsi(logStub.args[1][0])).to.match(/Ghost version: 1\.5\.0 \(at ~\/ghost\)/);
        expect(getInstanceStub.calledOnce).to.be.true;
    });

    it('outputs json when the json flag is passed and not in a ghost folder', function () {
        const VersionCommand = require(modulePath);
        const logStub = sinon.stub();
        const outputStub = sinon.stub();
        const getInstanceStub = sinon.stub().returns({version: null});
        const instance = new VersionCommand(
            {log: logStub, output: outputStub},
            {getInstance: getInstanceStub, cliVersion: '1.0.0'}
        );

        instance.run({json: true});
        expect(logStub.called).to.be.false;
        expect(outputStub.calledOnceWithExactly({
            cliVersion: '1.0.0',
            ghostVersion: null,
            dir: null
        })).to.be.true;
    });

    it('outputs json when the json flag is passed in a ghost folder', function () {
        const VersionCommand = require(modulePath);
        const logStub = sinon.stub();
        const outputStub = sinon.stub();
        const getInstanceStub = sinon.stub().returns({version: '1.5.0', dir: '/var/www/ghost'});
        const instance = new VersionCommand(
            {log: logStub, output: outputStub},
            {getInstance: getInstanceStub, cliVersion: '1.0.0'}
        );

        instance.run({json: true});
        expect(logStub.called).to.be.false;
        expect(outputStub.calledOnceWithExactly({
            cliVersion: '1.0.0',
            ghostVersion: '1.5.0',
            dir: '/var/www/ghost'
        })).to.be.true;
    });
});
