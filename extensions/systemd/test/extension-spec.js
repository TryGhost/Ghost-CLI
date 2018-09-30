'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const path = require('path');
const proxyquire = require('proxyquire').noCallThru();
const configStub = require('../../../test/utils/config-stub');

const fs = require('fs-extra');

const modulePath = '../index';
const errors = require('../../../lib/errors');
const SystemdExtension = require('../index');

describe('Unit: Systemd > Extension', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('setup hook', function () {
        const inst = new SystemdExtension({}, {}, {}, '/some/dir');
        const tasks = inst.setup();

        expect(tasks).to.have.length(1);
        expect(tasks[0].id).to.equal('systemd');
        expect(tasks[0].name).to.equal('Systemd');

        const [{enabled, task, skip}] = tasks;
        const config = configStub();
        const instance = {config, name: 'test_instance'};

        config.get.withArgs('process').returns('notsystemd');
        expect(enabled({argv: {local: true}, instance})).to.be.false;
        expect(config.get.called).to.be.false;

        expect(enabled({argv: {local: false}, instance})).to.be.false;
        expect(config.get.calledOnce).to.be.true;

        config.get.withArgs('process').returns('systemd');
        config.get.resetHistory();
        expect(enabled({argv: {local: false}, instance})).to.be.true;
        expect(config.get.calledOnce).to.be.true;

        const stub = sinon.stub(inst, '_setup').returns({stubCalled: true});
        expect(task('some', 'args')).to.deep.equal({stubCalled: true});
        expect(stub.calledOnceWithExactly('some', 'args')).to.be.true;

        const exists = sinon.stub(fs, 'existsSync');
        exists.returns(true);

        expect(skip({instance})).to.contain('Systemd service has already been set up');
        expect(exists.calledOnceWithExactly('/lib/systemd/system/ghost_test_instance.service')).to.be.true;

        exists.returns(false);
        exists.resetHistory();

        expect(skip({instance})).to.be.false;
        expect(exists.calledOnce).to.be.true;
    });

    describe('setup stage', function () {
        it('skips stage if ghost user hasn\'t been set up', function () {
            const uidStub = sinon.stub().returns(false);

            const SystemdExtension = proxyquire(modulePath, {
                './get-uid': uidStub
            });

            const skipStub = sinon.stub();
            const testInstance = new SystemdExtension({}, {}, {}, path.join(__dirname, '..'));

            testInstance._setup({instance: {dir: '/some/dir'}}, {skip: skipStub});
            expect(uidStub.calledOnce).to.be.true;
            expect(uidStub.calledWithExactly('/some/dir')).to.be.true;
            expect(skipStub.calledOnce).to.be.true;
            expect(skipStub.args[0][0]).to.contain('"ghost" user has not been created');
        });

        it('runs through template method and reloads daemon', function () {
            const uidStub = sinon.stub().returns(true);
            const readFileSyncStub = sinon.stub().returns('SOME TEMPLATE CONTENTS');

            const SystemdExtension = proxyquire(modulePath, {
                './get-uid': uidStub,
                'fs-extra': {readFileSync: readFileSyncStub}
            });

            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();
            const skipStub = sinon.stub();
            const testInstance = new SystemdExtension({log: logStub, sudo: sudoStub}, {}, {}, path.join(__dirname, '..'));
            const instance = {dir: '/some/dir', name: 'test'};
            const templateStub = sinon.stub(testInstance, 'template').resolves();

            return testInstance._setup({instance: instance}, {skip: skipStub}).then(() => {
                expect(uidStub.calledOnce).to.be.true;
                expect(uidStub.calledWithExactly('/some/dir')).to.be.true;
                expect(readFileSyncStub.calledOnce).to.be.true;
                expect(templateStub.calledOnce).to.be.true;
                expect(templateStub.calledWith(instance, 'SOME TEMPLATE CONTENTS')).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.calledWithExactly('systemctl daemon-reload')).to.be.true;
                expect(logStub.called).to.be.false;
                expect(skipStub.called).to.be.false;
            });
        });

        it('can handle error when template method fails', function () {
            const uidStub = sinon.stub().returns(true);
            const readFileSyncStub = sinon.stub().returns('SOME TEMPLATE CONTENTS');

            const SystemdExtension = proxyquire(modulePath, {
                './get-uid': uidStub,
                'fs-extra': {readFileSync: readFileSyncStub}
            });

            const logStub = sinon.stub();
            const sudoStub = sinon.stub().rejects({stderr: 'something went wrong'});
            const skipStub = sinon.stub();
            const testInstance = new SystemdExtension({log: logStub, sudo: sudoStub}, {}, {}, path.join(__dirname, '..'));
            const templateStub = sinon.stub(testInstance, 'template').resolves();
            const instance = {dir: '/some/dir', name: 'test'};

            return testInstance._setup({instance: instance}, {skip: skipStub}).then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.exist;
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(error.options.stderr).to.be.equal('something went wrong');
                expect(uidStub.calledOnce).to.be.true;
                expect(uidStub.calledWithExactly('/some/dir')).to.be.true;
                expect(readFileSyncStub.calledOnce).to.be.true;
                expect(templateStub.calledOnce).to.be.true;
                expect(templateStub.calledWith(instance, 'SOME TEMPLATE CONTENTS')).to.be.true;
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
            const sudoStub = sinon.stub().resolves();
            const testInstance = new SystemdExtension({sudo: sudoStub}, {}, {}, path.join(__dirname, '..'));

            return testInstance.uninstall({name: 'test'}).then(() => {
                expect(existsStub.calledOnce).to.be.true;
                expect(existsStub.calledWithExactly('/lib/systemd/system/ghost_test.service')).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.calledWithExactly('rm /lib/systemd/system/ghost_test.service')).to.be.true;
            });
        });

        it('throws systemerror if removing /lib/systemd file doesn\'t work', function () {
            existsStub.returns(true);
            const sudoStub = sinon.stub().rejects();
            const testInstance = new SystemdExtension({sudo: sudoStub}, {}, {}, path.join(__dirname, '..'));

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
            const sudoStub = sinon.stub().resolves();
            const testInstance = new SystemdExtension({sudo: sudoStub}, {}, {}, path.join(__dirname, '..'));

            return testInstance.uninstall({name: 'test'}).then(() => {
                expect(existsStub.calledOnce).to.be.true;
                expect(sudoStub.called).to.be.false;
            });
        });
    });
});
