'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../systemd';
const errors = require('../../../lib/errors');
const Systemd = require(modulePath);

const instance = {
    name: 'ghost_org'
};

function makeSystemd(options, ui) {
    let LocalSystem = Systemd;
    if (options !== null) {
        LocalSystem = proxyquire(modulePath, options);
    }
    return new LocalSystem(ui, null, instance);
}

describe('Unit: Systemd > Process Manager', function () {
    it('Returns proper systemd name', function () {
        const ext = new Systemd(null, null, instance);

        expect(ext.systemdName).to.equal('ghost_ghost_org');
    });

    describe('Start Hook', function () {
        let ext, ui;

        beforeEach(function () {
            ui = {sudo: sinon.stub().resolves()},
            ext = new Systemd(ui, null, instance);
            ext.ensureStarted = sinon.stub().resolves();
            ext._precheck = () => true;
        });

        it('Calls _precheck', function () {
            ext._precheck = sinon.stub();
            ext.start().then(() => {
                expect(ext._precheck.calledOnce).to.be.true;
            });
        });

        it('Runs as sudo', function () {
            ext.start().then(() => {
                const expectedCmd = 'systemctl start ghost_ghost_org';
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.getCall(0).args[0]).to.equal(expectedCmd);
            });
        });

        it('Errors when sudo does', function () {
            ui.sudo = sinon.stub().rejects();
            ext.start().then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(ui.sudo.calledOnce).to.be.true;
                expect(error).to.be.instanceOf(errors.ProcessError);
            });
        });

        it('Errors when starting failed', function () {
            ext.ensureStarted = sinon.stub().rejects(new errors.CliError('Wasn\'t started'));
            ext.start().then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(ext.ensureStarted.calledOnce).to.be.true;
                expect(error).to.be.instanceOf(errors.CliError);
            });
        });
    });

    describe('Stop Hook', function () {
        let ext, ui;

        beforeEach(function () {
            ui = {sudo: sinon.stub().resolves()},
            ext = new Systemd(ui, null, instance);
            ext.ensureStarted = sinon.stub().resolves();
            ext._precheck = () => true;
        });

        it('Calls _precheck', function () {
            ext._precheck = sinon.stub();
            ext.stop().then(() => {
                expect(ext._precheck.calledOnce).to.be.true;
            });
        });

        it('Runs as sudo', function () {
            ext.stop().then(() => {
                const expectedCmd = 'systemctl stop ghost_ghost_org';
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.getCall(0).args[0]).to.equal(expectedCmd);
            });
        });

        it('Errors when sudo does', function () {
            ui.sudo = sinon.stub().rejects();
            ext.stop().then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(ui.sudo.calledOnce).to.be.true;
                expect(error).to.be.instanceOf(errors.ProcessError);
            });
        });
    });

    describe('Restart Hook', function () {
        let ext, ui;

        beforeEach(function () {
            ui = {sudo: sinon.stub().resolves()},
            ext = new Systemd(ui, null, instance);
            ext.ensureStarted = sinon.stub().resolves();
            ext._precheck = () => true;
        });

        it('Calls _precheck', function () {
            ext._precheck = sinon.stub();
            ext.restart().then(() => {
                expect(ext._precheck.calledOnce).to.be.true;
            });
        });

        it('Runs as sudo', function () {
            ext.restart().then(() => {
                const expectedCmd = 'systemctl restart ghost_ghost_org';
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.getCall(0).args[0]).to.equal(expectedCmd);
            });
        });

        it('Errors when sudo does', function () {
            ui.sudo = sinon.stub().rejects();
            ext.restart().then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(ui.sudo.calledOnce).to.be.true;
                expect(error).to.be.instanceOf(errors.ProcessError);
            });
        });

        it('Errors when starting failed', function () {
            ext.ensureStarted = sinon.stub().rejects(new errors.CliError('Wasn\'t started'));
            ext.restart().then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.ok;
                expect(ext.ensureStarted.calledOnce).to.be.true;
                expect(error).to.be.instanceOf(errors.CliError);
            });
        });
    });

    describe('isEnabled', function () {
        let execaStub;

        beforeEach(function () {
            execaStub = sinon.stub();
        });

        it('Calls execa', function () {
            const expectedCmd = 'systemctl is-enabled ghost_ghost_org';
            const ext = makeSystemd({execa: {shellSync: execaStub}});

            expect(ext.isEnabled()).to.be.true;
            expect(execaStub.calledOnce).to.be.true;
            expect(execaStub.getCall(0).args[0]).to.equal(expectedCmd);
        });

        it('Passes bad errors through', function () {
            execaStub = sinon.stub().throws(new Error('ponies'));
            const ext = makeSystemd({execa: {shellSync: execaStub}});

            try {
                ext.isEnabled();
                expect(false, 'An error should have been thrown').to.be.true;
            } catch (error) {
                expect(execaStub.calledOnce).to.be.true;
                expect(error.message).to.equal('ponies');
            }
        });

        it('Doesn\'t pass disabled errors through', function () {
            let execaStub = sinon.stub().throws(new Error('disabled'));
            const proxyOpts = {execa: {shellSync: execaStub}};
            let ext = makeSystemd(proxyOpts);

            expect(ext.isEnabled()).to.be.false;

            execaStub = sinon.stub().throws(new Error('Failed to get unit file state'));
            ext = makeSystemd(proxyOpts);

            expect(ext.isEnabled()).to.be.false;
        });
    });

    describe('enable', function () {
        it('Calls systemd', function () {
            const expectedCmd = 'systemctl enable ghost_ghost_org --quiet';
            const ui = {sudo: sinon.stub().resolves()};
            const ext = makeSystemd(null, ui);
            ext.enable().then(() => {
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.getCall(0).args[0]).to.equal(expectedCmd);
            })
        });

        it('Passes errors through', function () {
            const ui = {sudo: sinon.stub().rejects(new Error('red'))};
            const ext = makeSystemd(null, ui);
            ext.enable().then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(ui.sudo.calledOnce).to.be.true;
                expect(error).to.be.ok;
                expect(error).to.be.instanceOf(errors.ProcessError);
            });
        });
    });

    describe('disable', function () {
        it('Calls systemd', function () {
            const expectedCmd = 'systemctl disable ghost_ghost_org --quiet';
            const ui = {sudo: sinon.stub().resolves()};
            const ext = makeSystemd(null, ui);
            ext.disable().then(() => {
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.getCall(0).args[0]).to.equal(expectedCmd);
            })
        });

        it('Passes errors through', function () {
            const ui = {sudo: sinon.stub().rejects(new Error('green'))};
            const ext = makeSystemd(null, ui);
            ext.disable().then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((error) => {
                expect(ui.sudo.calledOnce).to.be.true;
                expect(error).to.be.ok;
                expect(error).to.be.instanceOf(errors.ProcessError);
            });
        });
    });

    describe('isRunning', function () {
        let execaStub;

        beforeEach(function () {
            execaStub = sinon.stub();
        });

        it('Calls execa', function () {
            const expectedCmd = 'systemctl is-active ghost_ghost_org';
            const ext = makeSystemd({execa: {shellSync: execaStub}});

            expect(ext.isRunning()).to.be.true;
            expect(execaStub.calledOnce).to.be.true;
            expect(execaStub.getCall(0).args[0]).to.equal(expectedCmd);
        });

        it('Passes bad errors through', function () {
            execaStub = sinon.stub().throws(new Error('Zebra'));
            const ext = makeSystemd({execa: {shellSync: execaStub}});

            try {
                ext.isRunning();
                expect(false, 'An error should have been thrown').to.be.true;
            } catch (error) {
                expect(execaStub.calledOnce).to.be.true;
                expect(error.message).to.equal('Zebra');
            }
        });

        it('Doesn\'t pass stopped errors through', function () {
            let execaStub = sinon.stub().throws(new Error('inactive'));
            const proxyOpts = {execa: {shellSync: execaStub}};
            let ext = makeSystemd(proxyOpts);

            expect(ext.isRunning()).to.be.false;

            execaStub = sinon.stub().throws(new Error('activating'));
            ext = makeSystemd(proxyOpts);

            expect(ext.isRunning()).to.be.false;
        });
    });

    describe('_precheck', function () {
        let proxyOpts;

        beforeEach(function () {
            proxyOpts = {'./get-uid': sinon.stub().returns(true)};
        });

        it('Errors if uid doesn\'t been set', function () {
            proxyOpts['./get-uid'] = sinon.stub().returns(null);
            const ext = makeSystemd(proxyOpts);
            try {
                ext._precheck();
                expect(false, 'An error should have been thrown').to.be.true;
            } catch (error) {
                expect(proxyOpts['./get-uid'].calledOnce).to.be.true;
                expect(error).to.be.ok;
                expect(error).to.be.instanceOf(errors.SystemError);
                expect(error.message).to.match(/ghost setup linux-user systemd/);
            }
        });

        it('Passes if unit file exists', function () {
            const fsStub = sinon.stub().returns(true);
            proxyOpts.fs = {existsSync: fsStub};
            const ext = makeSystemd(proxyOpts);
            const expectedFile = '/lib/systemd/system/ghost_ghost_org.service';

            ext._precheck();
            expect(fsStub.calledOnce).to.be.true;
            expect(fsStub.getCall(0).args[0]).to.equal(expectedFile);
        });

        it('Errors if unit file doesn\'t exist', function () {
            const fsStub = sinon.stub().returns(false);
            proxyOpts.fs = {existsSync: fsStub};
            const ext = makeSystemd(proxyOpts);

            try {
                ext._precheck();
                expect(false, 'An error should have been thrown').to.be.true;
            } catch (error) {
                expect(fsStub.calledOnce).to.be.true;
                expect(error).to.be.ok;
                expect(error).to.be.instanceOf(errors.SystemError);
                expect(error.message).to.match(/ghost setup systemd/);
            }
        });
    });

    describe('willRun', function () {
        let execaStub;

        beforeEach(function () {
            execaStub = sinon.stub();
        });

        it('Calls execa', function () {
            const expectedCmd = 'which systemctl';
            const Systemd = proxyquire(modulePath,
                {execa: {shellSync: execaStub}});

            expect(Systemd.willRun()).to.be.true;
            expect(execaStub.calledOnce).to.be.true;
            expect(execaStub.getCall(0).args[0]).to.equal(expectedCmd);
        });

        it('Always fails', function () {
            execaStub = sinon.stub().throws(new Error());
            const Systemd = proxyquire(modulePath,
                {execa: {shellSync: execaStub}});

            expect(Systemd.willRun()).to.be.false;
            expect(execaStub.calledOnce).to.be.true;
        });
    });
});
