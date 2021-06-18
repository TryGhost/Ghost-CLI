'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../systemd';
const errors = require('../../../lib/errors');
const configStub = require('../../../test/utils/config-stub');
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
            instance.config = configStub();
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
                expect(ui.sudo.args[0][0]).to.equal(expectedCmd);
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
                expect(ui.sudo.args[0][0]).to.equal(expectedCmd);
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
                expect(ui.sudo.args[0][0]).to.equal(expectedCmd);
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
        it('Returns true if process manager is enabled', function () {
            const ui = {sudo: sinon.stub().resolves()};
            const expectedCmd = 'systemctl is-enabled ghost_ghost_org';
            const ext = makeSystemd(null, ui);

            ext.isEnabled().then((result) => {
                expect(result).to.be.true;
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.args[0][0]).to.equal(expectedCmd);
            });
        });

        it('Passes bad errors through', function () {
            const ui = {sudo: sinon.stub().rejects(new Error('unknown'))};
            const ext = makeSystemd(null, ui);
            const expectedCmd = 'systemctl is-enabled ghost_ghost_org';

            ext.isEnabled().then(() => {
                expect(false, 'An error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('unknown');
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.args[0][0]).to.equal(expectedCmd);
            });
        });

        it('Doesn\'t pass stopped errors through', function () {
            const ui = {sudo: sinon.stub().rejects(new Error('disabled'))};
            const ext = makeSystemd(null, ui);
            const expectedCmd = 'systemctl is-enabled ghost_ghost_org';

            ext.isEnabled().then((result) => {
                expect(result).to.be.false;
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.args[0][0]).to.equal(expectedCmd);
            });
        });
    });

    describe('enable', function () {
        it('Calls systemd', function () {
            const expectedCmd = 'systemctl enable ghost_ghost_org --quiet';
            const ui = {sudo: sinon.stub().resolves()};
            const ext = makeSystemd(null, ui);
            ext.enable().then(() => {
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.args[0][0]).to.equal(expectedCmd);
            });
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
                expect(ui.sudo.args[0][0]).to.equal(expectedCmd);
            });
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
        it('Returns true if process manager is running', function () {
            const ui = {sudo: sinon.stub().resolves()};
            const expectedCmd = 'systemctl is-active ghost_ghost_org';
            const ext = makeSystemd(null, ui);

            ext.isRunning().then((result) => {
                expect(result).to.be.true;
                expect(ui.sudo.calledOnce).to.be.true;
                expect(ui.sudo.args[0][0]).to.equal(expectedCmd);
            });
        });

        it('Throws ProcessError for bad errors', function () {
            const sudo = sinon.stub().rejects(new Error('unknown'));
            const ext = makeSystemd(null, {sudo});
            const expectedCmd = 'systemctl is-active ghost_ghost_org';

            ext.isRunning().then(() => {
                expect(false, 'An error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('unknown');
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(sudo.calledOnce).to.be.true;
                expect(sudo.calledWithExactly(expectedCmd)).to.be.true;
            });
        });

        it('Doesn\'t pass stopped errors through', function () {
            const sudo = sinon.stub().rejects(Object.assign(new Error(), {stdout: 'inactive'}));
            const ext = makeSystemd(null, {sudo});
            const expectedCmd = 'systemctl is-active ghost_ghost_org';

            ext.isRunning().then((result) => {
                expect(result).to.be.false;
                expect(sudo.calledOnce).to.be.true;
                expect(sudo.calledWithExactly(expectedCmd)).to.be.true;
            });
        });

        it('calls reset-failed if service is failed and returns false', function () {
            const sudo = sinon.stub();
            sudo.onFirstCall().rejects(Object.assign(new Error(), {stdout: 'failed'}));
            sudo.onSecondCall().resolves();

            const ext = makeSystemd(null, {sudo});
            const expectedCmd = 'systemctl is-active ghost_ghost_org';
            const resetCmd = 'systemctl reset-failed ghost_ghost_org';

            ext.isRunning().then((result) => {
                expect(result).to.be.false;
                expect(sudo.calledTwice).to.be.true;
                expect(sudo.firstCall.calledWithExactly(expectedCmd));
                expect(sudo.secondCall.calledWithExactly(resetCmd));
            });
        });

        it('calls reset-failed if services is failed and passes errors through', function () {
            const sudo = sinon.stub();
            sudo.onFirstCall().rejects(Object.assign(new Error(), {stdout: 'failed'}));
            sudo.onSecondCall().rejects(new Error('uh oh'));

            const ext = makeSystemd(null, {sudo});
            const expectedCmd = 'systemctl is-active ghost_ghost_org';
            const resetCmd = 'systemctl reset-failed ghost_ghost_org';

            ext.isRunning().then(() => {
                expect(false, 'An error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('uh oh');
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(sudo.calledTwice).to.be.true;
                expect(sudo.firstCall.calledWithExactly(expectedCmd)).to.be.true;
                expect(sudo.secondCall.calledWithExactly(resetCmd)).to.be.true;
            });
        });
    });

    describe('_precheck', function () {
        let proxyOpts;

        beforeEach(function () {
            proxyOpts = {'./get-uid': sinon.stub().returns(true)};
        });

        it('Errors if uid hasn\'t been set', function () {
            proxyOpts['./get-uid'] = sinon.stub().returns(null);
            const ext = makeSystemd(proxyOpts);
            try {
                ext._precheck();
                expect(false, 'An error should have been thrown').to.be.true;
            } catch (error) {
                expect(proxyOpts['./get-uid'].calledOnce).to.be.true;
                expect(error).to.be.ok;
                expect(error).to.be.instanceOf(errors.SystemError);
                expect(error.message).to.match(/Systemd process manager has not been set up or is corrupted./);
                expect(error.options.help).to.match(/ghost setup linux-user systemd/);
            }
        });

        it('Passes if unit file exists', function () {
            const fsStub = sinon.stub().returns(true);
            proxyOpts.fs = {existsSync: fsStub};
            const ext = makeSystemd(proxyOpts);
            const expectedFile = '/lib/systemd/system/ghost_ghost_org.service';

            ext._precheck();
            expect(fsStub.calledOnce).to.be.true;
            expect(fsStub.args[0][0]).to.equal(expectedFile);
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
                expect(error.message).to.match(/Systemd process manager has not been set up or is corrupted./);
                expect(error.options.help).to.match(/ghost setup systemd/);
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
            expect(execaStub.args[0][0]).to.equal(expectedCmd);
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
