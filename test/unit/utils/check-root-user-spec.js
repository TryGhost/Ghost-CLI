'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const os = require('os');
const fs = require('fs');
const checkRootUser = require('../../../lib/utils/check-root-user');

describe('Unit: Utils > checkRootUser', function () {
    const sandbox = sinon.sandbox.create();

    afterEach(() => {
        sandbox.restore();
    });

    it('skips check if run on windows', function () {
        const osStub = sandbox.stub(os, 'platform').returns('win32');
        const processStub = sandbox.stub(process, 'getuid').returns(0);

        checkRootUser('install');
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.called).to.be.false;
    });

    it('skips check if run on macos', function () {
        const osStub = sandbox.stub(os, 'platform').returns('darwin');
        const processStub = sandbox.stub(process, 'getuid').returns(0);

        checkRootUser('doctor');
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.called).to.be.false;
    });

    it('skips check if command run as non root user', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const processStub = sandbox.stub(process, 'getuid').returns(501);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        checkRootUser('update');
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.calledOnce).to.be.true;
        expect(errorStub.calledOnce).to.be.false;
        expect(exitStub.calledOnce).to.be.false;
    });

    it('shows special message for DigitalOcean One-Click installs', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const fsStub = sandbox.stub(fs, 'existsSync');
        const processStub = sandbox.stub(process, 'getuid').returns(0);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(true);
        fsStub.withArgs('/var/www/ghost/.ghost-cli').returns(true);

        try {
            checkRootUser('ls');
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.not.equal('should not be thrown');
            expect(fsStub.calledWithExactly('/root/.digitalocean_password')).to.be.true;
            expect(osStub.calledOnce).to.be.true;
            expect(processStub.calledOnce).to.be.true;
            expect(errorStub.calledOnce).to.be.true;
            expect(exitStub.calledOnce).to.be.true;
            expect(errorStub.args[0][0]).to.match(/We discovered that you are using the Digitalocean One-Click install./);
        }
    });

    it('shows special message for DigitalOcean One-Click installs, but doesn\'t exit on `stop`', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const fsStub = sandbox.stub(fs, 'existsSync');
        const processStub = sandbox.stub(process, 'getuid').returns(0);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(true);
        fsStub.withArgs('/var/www/ghost/.ghost-cli').returns(true);

        checkRootUser('stop');
        expect(fsStub.calledWithExactly('/root/.digitalocean_password')).to.be.true;
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.calledOnce).to.be.true;
        expect(errorStub.calledOnce).to.be.true;
        expect(exitStub.calledOnce).to.be.false;
        expect(errorStub.args[0][0]).to.match(/We discovered that you are using the Digitalocean One-Click install./);
    });

    it('shows special message for root installs', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const cwdStub = sandbox.stub(process, 'cwd').returns('/var/www/ghost');
        const fsStub = sandbox.stub(fs, 'existsSync');
        const fsStatStub = sandbox.stub(fs, 'statSync').returns({uid: 0});
        const processStub = sandbox.stub(process, 'getuid').returns(0);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(false);
        fsStub.withArgs('/var/www/ghost/.ghost-cli').returns(true);

        try {
            checkRootUser('ls');
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.not.equal('should not be thrown');
            expect(cwdStub.calledOnce).to.be.true;
            expect(fsStub.calledWithExactly('/root/.digitalocean_password')).to.be.true;
            expect(fsStub.calledWithExactly('/var/www/ghost/.ghost-cli')).to.be.true;
            expect(fsStatStub.calledWithExactly('/var/www/ghost/.ghost-cli')).to.be.true;
            expect(osStub.calledOnce).to.be.true;
            expect(processStub.calledOnce).to.be.true;
            expect(errorStub.calledOnce).to.be.true;
            expect(exitStub.calledOnce).to.be.true;
            expect(errorStub.args[0][0]).to.match(/It seems Ghost was installed using the root user./);
        }
    });

    it('shows special message for root installs, but doesn\'t exit on `start`', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const cwdStub = sandbox.stub(process, 'cwd').returns('/var/www/ghost');
        const fsStub = sandbox.stub(fs, 'existsSync');
        const fsStatStub = sandbox.stub(fs, 'statSync').returns({uid: 0});
        const processStub = sandbox.stub(process, 'getuid').returns(0);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(false);
        fsStub.withArgs('/var/www/ghost/.ghost-cli').returns(true);

        checkRootUser('start');
        expect(cwdStub.calledOnce).to.be.true;
        expect(fsStub.calledWithExactly('/root/.digitalocean_password')).to.be.true;
        expect(fsStub.calledWithExactly('/var/www/ghost/.ghost-cli')).to.be.true;
        expect(fsStatStub.calledWithExactly('/var/www/ghost/.ghost-cli')).to.be.true;
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.calledOnce).to.be.true;
        expect(errorStub.calledOnce).to.be.true;
        expect(exitStub.calledOnce).to.be.false;
        expect(errorStub.args[0][0]).to.match(/It seems Ghost was installed using the root user./);
    });

    it('throws error command run with root for non-root installs', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const cwdStub = sandbox.stub(process, 'cwd').returns('/var/www/ghost');
        const fsStub = sandbox.stub(fs, 'existsSync');
        const fsStatStub = sandbox.stub(fs, 'statSync').returns({uid: 501});
        const processStub = sandbox.stub(process, 'getuid').returns(0);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(false);
        fsStub.withArgs('/var/www/ghost/.ghost-cli').returns(true);

        try {
            checkRootUser('update');
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.not.equal('should not be thrown');
            expect(cwdStub.calledOnce).to.be.true;
            expect(fsStatStub.calledWithExactly('/var/www/ghost/.ghost-cli')).to.be.true;
            expect(osStub.calledOnce).to.be.true;
            expect(processStub.calledOnce).to.be.true;
            expect(errorStub.calledOnce).to.be.true;
            expect(exitStub.calledOnce).to.be.true;
            expect(errorStub.args[0][0]).to.match(/Can't run command as 'root' user/);
        }
    });

    it('throws error command run with root for non-root installs, but doesn\'t exit on `restart`', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const cwdStub = sandbox.stub(process, 'cwd').returns('/var/www/ghost');
        const fsStub = sandbox.stub(fs, 'existsSync');
        const fsStatStub = sandbox.stub(fs, 'statSync').returns({uid: 501});
        const processStub = sandbox.stub(process, 'getuid').returns(0);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(false);
        fsStub.withArgs('/var/www/ghost/.ghost-cli').returns(true);

        checkRootUser('restart');
        expect(cwdStub.calledOnce).to.be.true;
        expect(fsStatStub.calledWithExactly('/var/www/ghost/.ghost-cli')).to.be.true;
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.calledOnce).to.be.true;
        expect(errorStub.calledOnce).to.be.true;
        expect(exitStub.calledOnce).to.be.false;
        expect(errorStub.args[0][0]).to.match(/Can't run command as 'root' user/);
    });

    it('throws error command run with root outside of valid ghost installation', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const cwdStub = sandbox.stub(process, 'cwd').returns('/var/www/');
        const fsStub = sandbox.stub(fs, 'existsSync');
        const fsStatStub = sandbox.stub(fs, 'statSync').returns({uid: 501});
        const processStub = sandbox.stub(process, 'getuid').returns(0);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(false);
        fsStub.withArgs('/var/www/.ghost-cli').returns(false);

        try {
            checkRootUser('update');
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.not.equal('should not be thrown');
            expect(cwdStub.calledOnce).to.be.true;
            expect(fsStub.calledWithExactly('/var/www/.ghost-cli')).to.be.true;
            expect(fsStatStub.calledOnce).to.be.false;
            expect(osStub.calledOnce).to.be.true;
            expect(processStub.calledOnce).to.be.true;
            expect(errorStub.calledOnce).to.be.true;
            expect(exitStub.calledOnce).to.be.true;
            expect(errorStub.args[0][0]).to.match(/Can't run command as 'root' user/);
        }
    });

    it('throws error command run with root outside of valid ghost installation, but doesn\'t exit on `restart`', function () {
        const osStub = sandbox.stub(os, 'platform').returns('linux');
        const cwdStub = sandbox.stub(process, 'cwd').returns('/var/www/');
        const fsStub = sandbox.stub(fs, 'existsSync');
        const fsStatStub = sandbox.stub(fs, 'statSync').returns({uid: 501});
        const processStub = sandbox.stub(process, 'getuid').returns(0);
        const exitStub = sandbox.stub(process, 'exit').throws();
        const errorStub = sandbox.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(false);
        fsStub.withArgs('/var/www/.ghost-cli').returns(false);

        checkRootUser('restart');
        expect(cwdStub.calledOnce).to.be.true;
        expect(fsStub.calledWithExactly('/var/www/.ghost-cli')).to.be.true;
        expect(fsStatStub.calledOnce).to.be.false;
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.calledOnce).to.be.true;
        expect(errorStub.calledOnce).to.be.true;
        expect(exitStub.calledOnce).to.be.false;
        expect(errorStub.args[0][0]).to.match(/Can't run command as 'root' user/);
    });
});
