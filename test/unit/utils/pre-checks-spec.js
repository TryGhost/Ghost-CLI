'use strict';
const {expect} = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const stripAnsi = require('strip-ansi');
const os = require('os');
const fs = require('fs-extra');

function fake(stubs = {}) {
    return proxyquire('../../../lib/utils/pre-checks', stubs);
}

function getTasks(stubs = {}, ui = {}, system = {}) {
    const preChecks = fake(stubs);
    const listr = sinon.stub().resolves();

    return preChecks(Object.assign({listr}, ui), system).then(() => {
        expect(listr.calledOnce).to.be.true;
        return listr.args[0][0];
    });
}

describe('Unit: Utils > pre-checks', function () {
    afterEach(function () {
        delete process.env.GHOST_CLI_PRE_CHECKS;
    });

    describe('update check', function () {
        it('rejects error if latestVersion has an error', function (done) {
            const pkg = {name: 'ghost', version: '1.0.0'};
            const testError = new Error('update check');
            const latestVersion = sinon.stub().rejects(testError);

            getTasks({
                '../../package.json': pkg,
                'latest-version': latestVersion
            }).then(([task]) => {
                expect(task.title).to.equal('Checking for Ghost-CLI updates');

                return task.task();
            }).catch((err) => {
                expect(err.message).to.equal(testError.message);
                expect(latestVersion.calledOnce).to.be.true;
                expect(latestVersion.calledWithExactly('ghost', {agent: false})).to.be.true;
                done();
            });
        });

        it('doesn\'t do anything if there are no updates', function () {
            const pkg = {name: 'ghost', version: '1.0.0'};
            const latestVersion = sinon.stub().resolves('1.0.0');
            const log = sinon.stub();

            return getTasks({
                '../../package.json': pkg,
                'latest-version': latestVersion
            }, {log}).then(([task]) => task.task()).then(() => {
                expect(log.called).to.be.false;
                expect(latestVersion.calledOnce).to.be.true;
                expect(latestVersion.calledWithExactly('ghost', {agent: false})).to.be.true;
            });
        });

        it('logs a message if an update is available', function () {
            const pkg = {name: 'ghost', version: '1.0.0'};
            const latestVersion = sinon.stub().resolves('1.1.0');
            const log = sinon.stub();

            return getTasks({
                '../../package.json': pkg,
                'latest-version': latestVersion
            }, {log}).then(([task]) => task.task()).then(() => {
                expect(log.calledOnce).to.be.true;
                const msg = log.args[0][0];

                expect(stripAnsi(msg)).to.match(/You are running an outdated version of Ghost-CLI/);

                expect(latestVersion.calledOnce).to.be.true;
                expect(latestVersion.calledWithExactly('ghost', {agent: false})).to.be.true;
            });
        });

        it('enabled returns true if GHOST_CLI_PRE_CHECKS env var is unset', function () {
            return getTasks({}, {}).then(([task]) => task.enabled()).then((result) => {
                expect(result).to.be.true;
            });
        });

        it('enabled returns true if GHOST_CLI_PRE_CHECKS env var is not false', function () {
            process.env.GHOST_CLI_PRE_CHECKS = 'true';
            return getTasks({}, {}).then(([task]) => task.enabled()).then((result) => {
                expect(result).to.be.true;
            });
        });

        it('enabled returns false if GHOST_CLI_PRE_CHECKS env var is false', function () {
            process.env.GHOST_CLI_PRE_CHECKS = 'false';
            return getTasks({}, {}).then(([task]) => task.enabled()).then((result) => {
                expect(result).to.be.false;
            });
        });
    });

    describe('~/.config folder ownership', function () {
        afterEach(() => {
            sinon.restore();
            delete process.env.USER;
        });

        it('skips if ~/.config does not exist', function () {
            const homedir = sinon.stub(os, 'homedir').returns('/home/ghost');
            const exists = sinon.stub(fs, 'existsSync').returns(false);

            return getTasks({}, {}, {platform: {linux: true}}).then(([,task]) => {
                expect(task.enabled()).to.be.false;
                expect(homedir.calledOnce).to.be.true;
                expect(exists.calledOnce).to.be.true;
            });
        });

        it('skips if GHOST_CLI_PRE_CHECKS env var is false', function () {
            const homedir = sinon.stub(os, 'homedir').returns('/home/ghost');
            const exists = sinon.stub(fs, 'existsSync').returns(true);

            process.env.GHOST_CLI_PRE_CHECKS = 'false';
            return getTasks({}, {}, {platform: {linux: true}}).then(([,task]) => {
                expect(task.enabled()).to.be.false;
                expect(homedir.calledOnce).to.be.true;
                expect(exists.calledOnce).to.be.true;
            });
        });

        it('rejects error if fs.lstat errors', function (done) {
            const homedir = sinon.stub(os, 'homedir').returns('/home/ghost');
            const lstat = sinon.stub(fs, 'lstat').rejects(new Error('test error'));
            const exists = sinon.stub(fs, 'existsSync').returns(true);

            getTasks({}, {}, {platform: {linux: true}}).then(([,task]) => {
                expect(task.title).to.equal('Ensuring correct ~/.config folder ownership');
                expect(task.enabled()).to.be.true;
                expect(exists.calledOnce).to.be.true;
                return task.task();
            }).catch((error) => {
                expect(error.message).to.equal('test error');
                expect(homedir.calledOnce).to.be.true;
                expect(lstat.calledOnce).to.be.true;
                expect(lstat.calledWithExactly('/home/ghost/.config')).to.be.true;
                done();
            });
        });

        it('doesn\'t do anything if directory ownership if fine', function () {
            sinon.stub(os, 'homedir').returns('/home/ghost');
            sinon.stub(fs, 'lstat').resolves({uid: 1, gid: 1});
            const exists = sinon.stub(fs, 'existsSync').returns(true);
            const uid = sinon.stub(process, 'getuid').returns(1);
            const gid = sinon.stub(process, 'getgid').returns(1);
            const sudo = sinon.stub().resolves();

            return getTasks({}, {sudo}, {platform: {linux: false}}).then(([,task]) => {
                expect(task.enabled()).to.be.false;
                expect(exists.called).to.be.false;
                return task.task();
            }).then(() => {
                expect(uid.calledOnce).to.be.true;
                expect(gid.calledOnce).to.be.true;
                expect(sudo.called).to.be.false;
            });
        });

        it('calls chown if directory owner is not correct', function () {
            sinon.stub(os, 'homedir').returns('/home/ghost');
            sinon.stub(fs, 'lstat').resolves({uid: 1, gid: 1});
            const uid = sinon.stub(process, 'getuid').returns(2);
            const gid = sinon.stub(process, 'getgid').returns(2);
            const sudo = sinon.stub().resolves();
            process.env.USER = 'ghostuser';

            return getTasks({}, {sudo}).then(([,task]) => task.task()).then(() => {
                expect(uid.calledOnce).to.be.true;
                expect(gid.called).to.be.false;
                expect(sudo.calledOnce).to.be.true;

                expect(sudo.args[0][0]).to.equal('chown -R ghostuser:ghostuser /home/ghost/.config');
            });
        });

        it('calls chown if directory group is not correct', function () {
            sinon.stub(os, 'homedir').returns('/home/ghost');
            sinon.stub(fs, 'lstat').resolves({uid: 2, gid: 1});
            const uid = sinon.stub(process, 'getuid').returns(2);
            const gid = sinon.stub(process, 'getgid').returns(2);
            const sudo = sinon.stub().resolves();
            process.env.USER = 'ghostuser';

            return getTasks({}, {sudo}).then(([,task]) => task.task()).then(() => {
                expect(uid.calledOnce).to.be.true;
                expect(gid.calledOnce).to.be.true;
                expect(sudo.calledOnce).to.be.true;

                expect(sudo.args[0][0]).to.equal('chown -R ghostuser:ghostuser /home/ghost/.config');
            });
        });
    });
});
