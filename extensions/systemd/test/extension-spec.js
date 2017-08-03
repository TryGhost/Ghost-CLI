'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const path = require('path');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../index';
const errors = require('../../../lib/errors');

describe('Unit: Systemd > Extension', function () {
    describe('setup hook', function () {
        const SystemdExtension = require(modulePath);

        it('skips adding stage if argv.local is true', function () {
            let configStub = sinon.stub().returns('systemd');
            let instanceStub = sinon.stub().returns({config: {get: configStub}});
            let addStageStub = sinon.stub();

            let testInstance = new SystemdExtension({}, {getInstance: instanceStub}, {}, path.join(__dirname, '..'));

            testInstance.setup({addStage: addStageStub}, {local: true});
            expect(instanceStub.calledOnce).to.be.true;
            expect(addStageStub.calledOnce).to.be.false;
            expect(configStub.calledOnce).to.be.false;
        });

        it('skips adding stage if process is not systemd', function () {
            let configStub = sinon.stub().returns('local');
            let instanceStub = sinon.stub().returns({config: {get: configStub}});
            let addStageStub = sinon.stub();

            let testInstance = new SystemdExtension({}, {getInstance: instanceStub}, {}, path.join(__dirname, '..'));

            testInstance.setup({addStage: addStageStub}, {local: false});
            expect(instanceStub.calledOnce).to.be.true;
            expect(configStub.calledOnce).to.be.true;
            expect(addStageStub.calledOnce).to.be.false;
        });

        it('adds stage if local is not true and process is systemd', function () {
            let configStub = sinon.stub().returns('systemd');
            let instanceStub = sinon.stub().returns({config: {get: configStub}});
            let addStageStub = sinon.stub();

            let testInstance = new SystemdExtension({}, {getInstance: instanceStub}, {}, path.join(__dirname, '..'));

            testInstance.setup({addStage: addStageStub}, {local: false});
            expect(instanceStub.calledOnce).to.be.true;
            expect(configStub.calledOnce).to.be.true;
            expect(addStageStub.calledOnce).to.be.true;
            expect(addStageStub.calledWith('systemd')).to.be.true;
        });
    });

    describe('setup stage', function () {
        it('skips stage if ghost user hasn\'t been set up', function () {
            let uidStub = sinon.stub().returns(false);

            const SystemdExtension = proxyquire(modulePath, {
                './get-uid': uidStub
            });

            let logStub = sinon.stub();
            let skipStub = sinon.stub();
            let testInstance = new SystemdExtension({log: logStub}, {}, {}, path.join(__dirname, '..'));

            testInstance._setup({}, {instance: {dir: '/some/dir'}}, {skip: skipStub});
            expect(uidStub.calledOnce).to.be.true;
            expect(uidStub.calledWithExactly('/some/dir')).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/"ghost" user has not been created/);
            expect(skipStub.calledOnce).to.be.true;
        });

        it('skips stage if "extension.systemd" property in cliConfig is true', function () {
            let uidStub = sinon.stub().returns(true);

            const SystemdExtension = proxyquire(modulePath, {
                './get-uid': uidStub
            });

            let logStub = sinon.stub();
            let skipStub = sinon.stub();
            let getStub = sinon.stub().returns(true);
            let testInstance = new SystemdExtension({log: logStub}, {}, {}, path.join(__dirname, '..'));
            let instance = {dir: '/some/dir', cliConfig: {get: getStub}};

            testInstance._setup({}, {instance: instance}, {skip: skipStub});
            expect(uidStub.calledOnce).to.be.true;
            expect(uidStub.calledWithExactly('/some/dir')).to.be.true;
            expect(getStub.calledOnce).to.be.true;
            expect(getStub.calledWithExactly('extension.systemd', false)).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/Systemd service has already been set up/);
            expect(skipStub.calledOnce).to.be.true;
        });

        it('skips stage if systemd file already exists', function () {
            let uidStub = sinon.stub().returns(true);
            let existsStub = sinon.stub().returns(true);

            const SystemdExtension = proxyquire(modulePath, {
                './get-uid': uidStub,
                'fs-extra': {existsSync: existsStub}
            });

            let logStub = sinon.stub();
            let skipStub = sinon.stub();
            let getStub = sinon.stub().returns(false);
            let testInstance = new SystemdExtension({log: logStub}, {}, {}, path.join(__dirname, '..'));
            let instance = {dir: '/some/dir', cliConfig: {get: getStub}, name: 'test'};

            testInstance._setup({}, {instance: instance}, {skip: skipStub});
            expect(uidStub.calledOnce).to.be.true;
            expect(uidStub.calledWithExactly('/some/dir')).to.be.true;
            expect(getStub.calledOnce).to.be.true;
            expect(existsStub.calledOnce).to.be.true;
            expect(existsStub.calledWithExactly('/lib/systemd/system/ghost_test.service')).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/Systemd service has already been set up/);
            expect(skipStub.calledOnce).to.be.true;
        });

        it('runs through template method and reloads daemon', function () {
            let uidStub = sinon.stub().returns(true);
            let existsStub = sinon.stub().returns(false);
            let readFileSyncStub = sinon.stub().returns('SOME TEMPLATE CONTENTS');

            const SystemdExtension = proxyquire(modulePath, {
                './get-uid': uidStub,
                'fs-extra': {existsSync: existsStub, readFileSync: readFileSyncStub}
            });

            let logStub = sinon.stub();
            let sudoStub = sinon.stub().resolves();
            let skipStub = sinon.stub();
            let getStub = sinon.stub().returns(false);
            let templateStub = sinon.stub().resolves();
            let testInstance = new SystemdExtension({log: logStub, sudo: sudoStub}, {}, {}, path.join(__dirname, '..'));
            let instance = {dir: '/some/dir', cliConfig: {get: getStub}, name: 'test', template: templateStub};

            return testInstance._setup({}, {instance: instance}, {skip: skipStub}).then(() => {
                expect(uidStub.calledOnce).to.be.true;
                expect(uidStub.calledWithExactly('/some/dir')).to.be.true;
                expect(getStub.calledOnce).to.be.true;
                expect(existsStub.calledOnce).to.be.true;
                expect(readFileSyncStub.calledOnce).to.be.true;
                expect(templateStub.calledOnce).to.be.true;
                expect(templateStub.calledWith('SOME TEMPLATE CONTENTS')).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.calledWithExactly('systemctl daemon-reload')).to.be.true;
                expect(logStub.called).to.be.false;
                expect(skipStub.called).to.be.false;
            });
        });
    });

    describe('uninstall hook', function () {
        let existsStub;
        let SystemdExtension;

        beforeEach(() => {
            existsStub = sinon.stub();
            SystemdExtension = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsStub}
            });
        });

        it('tries to remove file from /lib/systemd if it exists', function () {
            existsStub.returns(true);
            let sudoStub = sinon.stub().resolves();
            let testInstance = new SystemdExtension({sudo: sudoStub}, {}, {}, path.join(__dirname, '..'));

            return testInstance.uninstall({name: 'test'}).then(() => {
                expect(existsStub.calledOnce).to.be.true;
                expect(existsStub.calledWithExactly('/lib/systemd/system/ghost_test.service')).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.calledWithExactly('rm /lib/systemd/system/ghost_test.service')).to.be.true;
            });
        });

        it('throws systemerror if removing /lib/systemd file doesn\'t work', function () {
            existsStub.returns(true);
            let sudoStub = sinon.stub().rejects();
            let testInstance = new SystemdExtension({sudo: sudoStub}, {}, {}, path.join(__dirname, '..'));

            return testInstance.uninstall({name: 'test'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/service file link could not be removed/);
                expect(existsStub.calledOnce).to.be.true;
                expect(existsStub.calledWithExactly('/lib/systemd/system/ghost_test.service')).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.calledWithExactly('rm /lib/systemd/system/ghost_test.service')).to.be.true;
            });
        });

        it('doesn\'t do anything if file does not exist', function () {
            existsStub.returns(false);
            let sudoStub = sinon.stub().resolves();
            let testInstance = new SystemdExtension({sudo: sudoStub}, {}, {}, path.join(__dirname, '..'));

            return testInstance.uninstall({name: 'test'}).then(() => {
                expect(existsStub.calledOnce).to.be.true;
                expect(sudoStub.called).to.be.false;
            });
        });
    });
});
