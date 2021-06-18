const {expect} = require('chai');
const sinon = require('sinon');

const sysinfo = require('systeminformation');
const {SystemError} = require('../../../../../lib/errors');

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

    it('rejects if platform is not linux', async function () {
        const osInfo = sinon.stub(sysinfo, 'osInfo').resolves();
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: false}}
        };

        try {
            await systemStack.task(ctx);
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Operating system is not Linux\'');
            expect(osInfo.called).to.be.false;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/not Linux/);
            expect(confirmStub.calledOnce).to.be.true;
            return;
        }

        expect(false, 'error should have been thrown').to.be.true;
    });

    it('does not reject if confirm resolves with true', async function () {
        const osInfo = sinon.stub(sysinfo, 'osInfo').resolves();
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(true);
        const skipStub = sinon.stub();

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: false}}
        };

        await systemStack.task(ctx, {skip: skipStub});
        expect(osInfo.called).to.be.false;
        expect(logStub.calledOnce).to.be.true;
        expect(logStub.args[0][0]).to.match(/failed with message/);
        expect(logStub.args[0][0]).to.match(/not Linux/);
        expect(confirmStub.calledOnce).to.be.true;
        expect(skipStub.calledOnce).to.be.true;
    });

    it('rejects if os distribution is not Ubuntu', async function () {
        const osInfo = sinon.stub(sysinfo, 'osInfo').resolves({distro: 'Debian', release: '9'});
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        try {
            await systemStack.task(ctx);
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Linux version is not Ubuntu 16, 18, or 20\'');
            expect(osInfo.calledOnce).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/not Ubuntu 16/);
            expect(confirmStub.calledOnce).to.be.true;
            return;
        }

        expect(false, 'error should have been thrown').to.be.true;
    });

    it('rejects if os release is not Ubuntu 16, 18, or 20', async function () {
        const osInfo = sinon.stub(sysinfo, 'osInfo').resolves({distro: 'Ubuntu', release: '14.04.1 LTS'});
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        try {
            await systemStack.task(ctx);
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Linux version is not Ubuntu 16, 18, or 20\'');
            expect(osInfo.calledOnce).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/not Ubuntu 16/);
            expect(confirmStub.calledOnce).to.be.true;
            return;
        }

        expect(false, 'error should have been thrown').to.be.true;
    });

    it('returns without error when both systemd/nginx are found', async function () {
        const osInfo = sinon.stub(sysinfo, 'osInfo').resolves({distro: 'Ubuntu', release: '20.04.1 LTS'});
        const services = sinon.stub(sysinfo, 'services');

        services.withArgs('nginx').resolves([{name: 'nginx', running: true}]);
        services.withArgs('systemd').resolves([{name: 'systemd', running: true}]);

        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        await systemStack.task(ctx);
        expect(osInfo.calledOnce).to.be.true;
        expect(services.calledTwice).to.be.true;
        expect(logStub.called).to.be.false;
    });

    it('throws when systemd not found', async function () {
        const osInfo = sinon.stub(sysinfo, 'osInfo').resolves({distro: 'Ubuntu', release: '20.04.1 LTS'});
        const services = sinon.stub(sysinfo, 'services');

        services.withArgs('nginx').resolves([{name: 'nginx', running: true}]);
        services.withArgs('systemd').resolves([]);

        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        try {
            await systemStack.task(ctx);
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Missing package(s): systemd\'');
            expect(osInfo.calledOnce).to.be.true;
            expect(services.calledTwice).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/package\(s\): systemd/);
            expect(confirmStub.calledOnce).to.be.true;
            return;
        }

        expect(false, 'error should have been thrown').to.be.true;
    });

    it('throws when systemd check errors', async function () {
        const osInfo = sinon.stub(sysinfo, 'osInfo').resolves({distro: 'Ubuntu', release: '20.04.1 LTS'});
        const services = sinon.stub(sysinfo, 'services');

        services.withArgs('nginx').resolves([{name: 'nginx', running: true}]);
        services.withArgs('systemd').rejects();

        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        try {
            await systemStack.task(ctx);
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Missing package(s): systemd\'');
            expect(osInfo.calledOnce).to.be.true;
            expect(services.calledTwice).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/package\(s\): systemd/);
            expect(confirmStub.calledOnce).to.be.true;
            return;
        }

        expect(false, 'error should have been thrown').to.be.true;
    });

    it('throws when nginx not found', async function () {
        const osInfo = sinon.stub(sysinfo, 'osInfo').resolves({distro: 'Ubuntu', release: '20.04.1 LTS'});
        const services = sinon.stub(sysinfo, 'services');

        services.withArgs('nginx').resolves([]);
        services.withArgs('systemd').resolves([{name: 'systemd', running: true}]);

        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        try {
            await systemStack.task(ctx);
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Missing package(s): nginx\'');
            expect(osInfo.calledOnce).to.be.true;
            expect(services.calledTwice).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/package\(s\): nginx/);
            expect(confirmStub.calledOnce).to.be.true;
            return;
        }

        expect(false, 'error should have been thrown').to.be.true;
    });

    it('throws when nginx check errors', async function () {
        const osInfo = sinon.stub(sysinfo, 'osInfo').resolves({distro: 'Ubuntu', release: '20.04.1 LTS'});
        const services = sinon.stub(sysinfo, 'services').rejects(new Error('test error'));

        services.withArgs('nginx').rejects();
        services.withArgs('systemd').resolves([{name: 'systemd', running: true}]);

        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        try {
            await systemStack.task(ctx);
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.equal('System stack checks failed with message: \'Missing package(s): nginx\'');
            expect(osInfo.calledOnce).to.be.true;
            expect(services.calledTwice).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/failed with message/);
            expect(logStub.args[0][0]).to.match(/package\(s\): nginx/);
            expect(confirmStub.calledOnce).to.be.true;
            return;
        }

        expect(false, 'error should have been thrown').to.be.true;
    });
});
