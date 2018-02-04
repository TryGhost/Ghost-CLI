'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const execa = require('execa');
const errors = require('../../../../../lib/errors');

const systemStack = require('../../../../../lib/commands/doctor/checks/system-stack');

describe('Unit: Doctor Checks > systemStack', function () {
    const sandbox = sinon.sandbox.create();

    afterEach(() => {
        sandbox.restore();
    });

    it('enabled works', function () {
        expect(systemStack.enabled({local: false})).to.be.true;
        expect(systemStack.enabled({local: true})).to.be.false;
    });

    it('skip works', function () {
        expect(systemStack.skip({argv: {stack: false}})).to.be.true;
        expect(systemStack.skip({argv: {stack: true}})).to.be.false;
    });

    it('rejects if platform is not linux', function () {
        const execaStub = sandbox.stub(execa, 'shell').resolves();
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: false});

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: false}}
        };

        return systemStack.task(ctx).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Operating system is not Linux\'');
            expect(execaStub.called).to.be.false;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/not Linux/);
            expect(confirmStub.calledOnce).to.be.true;
        });
    });

    it('does not call confirm if prompt is disabled', function () {
        const execaStub = sandbox.stub(execa, 'shell').resolves();
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: false});

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: false},
            system: {platform: {linux: false}}
        };

        return systemStack.task(ctx).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Operating system is not Linux\'');
            expect(execaStub.called).to.be.false;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/not Linux/);
            expect(confirmStub.called).to.be.false;
        });
    });

    it('does not reject if confirm resolves with true', function () {
        const execaStub = sandbox.stub(execa, 'shell').resolves();
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: true});
        const skipStub = sandbox.stub();

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: false}}
        };

        return systemStack.task(ctx, {skip: skipStub}).then(() => {
            expect(execaStub.called).to.be.false;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/not Linux/);
            expect(confirmStub.calledOnce).to.be.true;
            expect(skipStub.calledOnce).to.be.true;
        });
    });

    it('rejects if lsb_release command does not exist', function () {
        const execaStub = sandbox.stub(execa, 'shell').rejects();
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: false});

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        return systemStack.task(ctx).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Linux version is not Ubuntu 16\'');
            expect(execaStub.calledOnce).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/not Ubuntu 16/);
            expect(confirmStub.calledOnce).to.be.true;
        });
    });

    it('rejects if lsb_release command does not return Ubuntu 16', function () {
        const execaStub = sandbox.stub(execa, 'shell').resolves({stdout: 'Ubuntu 14'});
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: false});

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        return systemStack.task(ctx).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Linux version is not Ubuntu 16\'');
            expect(execaStub.calledOnce).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/not Ubuntu 16/);
            expect(confirmStub.calledOnce).to.be.true;
        });
    });

    it('groups missing rejected promises for systemd and nginx', function () {
        const execaStub = sandbox.stub(execa, 'shell');
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: false});
        const listrStub = sandbox.stub().rejects({
            errors: [{missing: 'systemd'}, {missing: 'nginx'}]
        });

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, listr: listrStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        execaStub.withArgs('lsb_release -a').resolves({stdout: 'Ubuntu 16'});

        return systemStack.task(ctx).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Missing package(s): systemd, nginx\'');
            expect(execaStub.calledOnce).to.be.true;
            expect(listrStub.calledOnce).to.be.true;
            expect(listrStub.args[0][2].renderer).to.equal('silent');
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/Missing package\(s\): systemd, nginx/);
            expect(confirmStub.calledOnce).to.be.true;
        });
    });

    it('nginx and systemd checks reject correctly', function () {
        const execaStub = sandbox.stub(execa, 'shell');
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: false});

        execaStub.withArgs('lsb_release -a').resolves({stdout: 'Ubuntu 16'});
        execaStub.withArgs('dpkg -l | grep nginx').rejects();
        execaStub.withArgs('dpkg -l | grep systemd').rejects();

        const listrStub = sandbox.stub().callsFake(function (tasks, ctx, opts) {
            expect(opts.renderer).to.equal('verbose');

            const systemdCheck = tasks.find(task => task.title.match(/systemd/));
            const nginxCheck = tasks.find(task => task.title.match(/nginx/));
            expect(systemdCheck).to.exist;
            expect(nginxCheck).to.exist;

            return systemdCheck.task().then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.deep.equal({missing: 'systemd'});

                return nginxCheck.task();
            }).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.deep.equal({missing: 'nginx'});

                return Promise.reject({errors: [{missing: 'systemd'}, {missing: 'nginx'}]});
            });
        });

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, listr: listrStub, allowPrompt: true, verbose: true},
            system: {platform: {linux: true}}
        };

        return systemStack.task(ctx).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Missing package(s): systemd, nginx\'');
            expect(execaStub.calledThrice).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/Missing package\(s\): systemd, nginx/);
            expect(confirmStub.calledOnce).to.be.true;
        });
    });

    it('resolves if all stack conditions are met', function () {
        const execaStub = sandbox.stub(execa, 'shell');
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: false});

        execaStub.withArgs('lsb_release -a').resolves({stdout: 'Ubuntu 16'});
        const listrStub = sinon.stub().resolves();

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, listr: listrStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        return systemStack.task(ctx).then(() => {
            expect(listrStub.calledOnce).to.be.true;
            expect(logStub.called).to.be.false;
            expect(confirmStub.called).to.be.false;
        });
    });
});
