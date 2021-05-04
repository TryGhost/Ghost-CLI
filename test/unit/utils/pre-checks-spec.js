const {expect, use} = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const os = require('os');
const fs = require('fs-extra');

use(require('chai-as-promised'));

function load(stubs = {}) {
    return proxyquire('../../../lib/utils/pre-checks', stubs);
}

describe('Unit: Utils > pre-checks', function () {
    afterEach(function () {
        delete process.env.GHOST_CLI_PRE_CHECKS;
    });

    describe('pre-checks', function () {
        it('skips if GHOST_CLI_PRE_CHECKS is false', function () {
            const listr = sinon.stub();
            process.env.GHOST_CLI_PRE_CHECKS = 'false';

            const preChecks = load();
            preChecks({listr}, {});
            expect(listr.called).to.be.false;
        });

        it('calls listr with tasks & correct options', async function () {
            const listr = sinon.stub().resolves();
            const ui = {listr};

            const preChecks = load();
            await preChecks(ui, {});
            expect(listr.calledOnce).to.be.true;

            const [tasks, ctx, opts] = listr.args[0];
            expect(tasks).to.have.length(2);
            expect(ctx).to.deep.equal({ui});
            expect(opts).to.deep.equal({clearOnSuccess: true});
        });
    });

    describe('update check', function () {
        it('rejects error if latestVersion has an error', async function () {
            const pkg = {name: 'ghost', version: '1.0.0'};
            const testError = new Error('update check');
            const latestVersion = sinon.stub().rejects(testError);
            const ui = {
                log: sinon.stub()
            };

            const {updateCheck} = load({
                '../../package.json': pkg,
                'latest-version': latestVersion
            });

            await expect(updateCheck({ui})).to.be.rejectedWith(testError);
            expect(latestVersion.calledOnce).to.be.true;
            expect(latestVersion.calledWithExactly('ghost', {agent: false})).to.be.true;
        });

        it('doesn\'t do anything if there are no updates', async function () {
            const pkg = {name: 'ghost', version: '1.0.0'};
            const latestVersion = sinon.stub().resolves('1.0.0');

            const ui = {
                log: sinon.stub()
            };

            const {updateCheck} = load({
                '../../package.json': pkg,
                'latest-version': latestVersion
            });

            await updateCheck({ui});
            expect(ui.log.called).to.be.false;
            expect(latestVersion.calledOnce).to.be.true;
            expect(latestVersion.calledWithExactly('ghost', {agent: false})).to.be.true;
        });

        it('logs a message if an update is available', async function () {
            const pkg = {name: 'ghost', version: '1.0.0'};
            const latestVersion = sinon.stub().resolves('1.1.0');

            const ui = {
                log: sinon.stub()
            };

            const {updateCheck} = load({
                '../../package.json': pkg,
                'latest-version': latestVersion
            });

            await updateCheck({ui});
            expect(ui.log.calledOnce).to.be.true;
            expect(ui.log.args[0][0]).to.match(/You are running an outdated version of Ghost-CLI/);
            expect(latestVersion.calledOnce).to.be.true;
            expect(latestVersion.calledWithExactly('ghost', {agent: false})).to.be.true;
        });
    });

    describe('~/.config folder ownership', function () {
        afterEach(() => {
            sinon.restore();
            delete process.env.USER;
        });

        it('rejects error if fs.lstat errors', async function () {
            const testErr = new Error('test error');

            const homedir = sinon.stub(os, 'homedir').returns('/home/ghost');
            const lstat = sinon.stub(fs, 'lstat').rejects(testErr);
            const ui = {};

            const {checkConfigPerms} = load();

            await expect(checkConfigPerms({ui})).to.be.rejectedWith(testErr);
            expect(homedir.calledOnce).to.be.true;
            expect(lstat.calledOnce).to.be.true;
            expect(lstat.calledWithExactly('/home/ghost/.config')).to.be.true;
        });

        it('doesn\'t do anything if directory ownership if fine', async function () {
            sinon.stub(os, 'homedir').returns('/home/ghost');
            sinon.stub(fs, 'lstat').resolves({uid: 1, gid: 1});
            const uid = sinon.stub(process, 'getuid').returns(1);
            const gid = sinon.stub(process, 'getgid').returns(1);
            const sudo = sinon.stub().resolves();

            const ui = {sudo};
            const {checkConfigPerms} = load();

            await checkConfigPerms({ui});
            expect(uid.calledOnce).to.be.true;
            expect(gid.calledOnce).to.be.true;
            expect(sudo.called).to.be.false;
        });

        it('calls chown if directory owner is not correct', async function () {
            sinon.stub(os, 'homedir').returns('/home/ghost');
            sinon.stub(fs, 'lstat').resolves({uid: 1, gid: 1});
            const uid = sinon.stub(process, 'getuid').returns(2);
            const gid = sinon.stub(process, 'getgid').returns(2);
            const sudo = sinon.stub().resolves();
            process.env.USER = 'ghostuser';

            const ui = {sudo};
            const {checkConfigPerms} = load();

            await checkConfigPerms({ui});
            expect(uid.calledOnce).to.be.true;
            expect(gid.called).to.be.false;
            expect(sudo.calledOnceWithExactly(
                'chown -R ghostuser:ghostuser /home/ghost/.config'
            )).to.be.true;
        });

        it('calls chown if directory group is not correct', async function () {
            sinon.stub(os, 'homedir').returns('/home/ghost');
            sinon.stub(fs, 'lstat').resolves({uid: 2, gid: 1});
            const uid = sinon.stub(process, 'getuid').returns(2);
            const gid = sinon.stub(process, 'getgid').returns(2);
            const sudo = sinon.stub().resolves();
            process.env.USER = 'ghostuser';

            const ui = {sudo};
            const {checkConfigPerms} = load();

            await checkConfigPerms({ui});
            expect(uid.calledOnce).to.be.true;
            expect(gid.calledOnce).to.be.true;
            expect(sudo.calledOnceWithExactly(
                'chown -R ghostuser:ghostuser /home/ghost/.config'
            )).to.be.true;
        });
    });
});
