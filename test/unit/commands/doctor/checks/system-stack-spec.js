'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const execa = require('execa');
const errors = require('../../../../../lib/errors');

const systemStack = require('../../../../../lib/commands/doctor/checks/system-stack');

describe('Unit: Doctor Checks > systemStack', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('enabled works', function () {
        expect(systemStack.enabled({local: true}), 'false if local is true').to.be.false;
        expect(systemStack.enabled({
            local: false,
            instance: {process: {name: 'local'}}
        }), 'false if local is false and process name is local').to.be.false;
        expect(systemStack.enabled({
            local: false,
            instance: {process: {name: 'systemd'}}
        }), 'true if local is false and process name is not local').to.be.true;
    });

    it('skip works', function () {
        expect(systemStack.skip({argv: {stack: false}})).to.be.true;
        expect(systemStack.skip({argv: {stack: true}})).to.be.false;
    });

    it('rejects if platform is not linux', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves();
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

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

    it('does not reject if confirm resolves with true', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves();
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(true);
        const skipStub = sinon.stub();

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
        const execaStub = sinon.stub(execa, 'shell').rejects();
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        return systemStack.task(ctx).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Linux version is not Ubuntu 16 or 18\'');
            expect(execaStub.calledOnce).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/not Ubuntu 16/);
            expect(confirmStub.calledOnce).to.be.true;
        });
    });

    it('rejects if lsb_release command does not return Ubuntu 16', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves({stdout: 'Ubuntu 14'});
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        return systemStack.task(ctx).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Linux version is not Ubuntu 16 or 18\'');
            expect(execaStub.calledOnce).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/not Ubuntu 16/);
            expect(confirmStub.calledOnce).to.be.true;
        });
    });

    it('groups missing rejected promises for systemd and nginx', function () {
        const execaStub = sinon.stub(execa, 'shell');
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);
        const listrStub = sinon.stub().rejects({
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
        const execaStub = sinon.stub(execa, 'shell');
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        execaStub.withArgs('lsb_release -a').resolves({stdout: 'Ubuntu 16'});
        execaStub.withArgs('dpkg -l | grep nginx').rejects();
        execaStub.withArgs('dpkg -l | grep systemd').rejects();

        const listrStub = sinon.stub().callsFake(function (tasks, ctx, opts) {
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
        const execaStub = sinon.stub(execa, 'shell');
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

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

    it('resolves if all stack conditions are met (ubuntu 18)', function () {
        const execaStub = sinon.stub(execa, 'shell');
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        execaStub.withArgs('lsb_release -a').resolves({stdout: 'Ubuntu 18'});
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
