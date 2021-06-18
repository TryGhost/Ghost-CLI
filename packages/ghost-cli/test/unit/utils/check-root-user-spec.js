'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const os = require('os');
const fs = require('fs');
const checkRootUser = require('../../../lib/utils/check-root-user');

describe('Unit: Utils > checkRootUser', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('skips check if run on windows', function () {
        const osStub = sinon.stub(os, 'platform').returns('win32');
        const processStub = sinon.stub(process, 'getuid').returns(0);

        checkRootUser('install');
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.called).to.be.false;
    });

    it('skips check if run on macos', function () {
        const osStub = sinon.stub(os, 'platform').returns('darwin');
        const processStub = sinon.stub(process, 'getuid').returns(0);

        checkRootUser('doctor');
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.called).to.be.false;
    });

    it('skips check if command run as non root user', function () {
        const osStub = sinon.stub(os, 'platform').returns('linux');
        const processStub = sinon.stub(process, 'getuid').returns(501);
        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

        checkRootUser('update');
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.calledOnce).to.be.true;
        expect(errorStub.calledOnce).to.be.false;
        expect(exitStub.calledOnce).to.be.false;
    });

    it('shows special message for DigitalOcean One-Click root installs', function () {
        const osStub = sinon.stub(os, 'platform').returns('linux');
        const cwdStub = sinon.stub(process, 'cwd').returns('/var/www/ghost');
        const fsStub = sinon.stub(fs, 'existsSync');
        const fsStatStub = sinon.stub(fs, 'statSync').returns({uid: 0});
        const processStub = sinon.stub(process, 'getuid').returns(0);
        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(true);
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
            expect(errorStub.args[0][0]).to.match(/It looks like you're using using the DigitalOcean One-Click install./);
        }
    });

    it('throws error command run with root for non-root installs on a Digitalocean One-Click install', function () {
        const osStub = sinon.stub(os, 'platform').returns('linux');
        const cwdStub = sinon.stub(process, 'cwd').returns('/var/www/ghost');
        const fsStub = sinon.stub(fs, 'existsSync');
        const fsStatStub = sinon.stub(fs, 'statSync').returns({uid: 666});
        const processStub = sinon.stub(process, 'getuid').returns(0);
        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(true);
        fsStub.withArgs('/var/www/ghost/.ghost-cli').returns(true);

        try {
            checkRootUser('update');
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
            expect(errorStub.args[0][0]).to.match(/You can't run commands as the 'root' user/);
        }
    });

    it('shows special message for DigitalOcean One-Click root installs, but doesn\'t exit on `stop`', function () {
        const osStub = sinon.stub(os, 'platform').returns('linux');
        const cwdStub = sinon.stub(process, 'cwd').returns('/var/www/ghost');
        const fsStub = sinon.stub(fs, 'existsSync');
        const fsStatStub = sinon.stub(fs, 'statSync').returns({uid: 0});
        const processStub = sinon.stub(process, 'getuid').returns(0);
        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

        fsStub.withArgs('/root/.digitalocean_password').returns(true);
        fsStub.withArgs('/var/www/ghost/.ghost-cli').returns(true);

        checkRootUser('stop');
        expect(cwdStub.calledOnce).to.be.true;
        expect(fsStub.calledWithExactly('/root/.digitalocean_password')).to.be.true;
        expect(fsStub.calledWithExactly('/var/www/ghost/.ghost-cli')).to.be.true;
        expect(fsStatStub.calledWithExactly('/var/www/ghost/.ghost-cli')).to.be.true;
        expect(osStub.calledOnce).to.be.true;
        expect(processStub.calledOnce).to.be.true;
        expect(errorStub.calledOnce).to.be.true;
        expect(exitStub.calledOnce).to.be.false;
        expect(errorStub.args[0][0]).to.match(/It looks like you're using using the DigitalOcean One-Click install./);
    });

    it('shows special message for root installs', function () {
        const osStub = sinon.stub(os, 'platform').returns('linux');
        const cwdStub = sinon.stub(process, 'cwd').returns('/var/www/ghost');
        const fsStub = sinon.stub(fs, 'existsSync');
        const fsStatStub = sinon.stub(fs, 'statSync').returns({uid: 0});
        const processStub = sinon.stub(process, 'getuid').returns(0);
        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

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
            expect(errorStub.args[0][0]).to.match(/It looks like Ghost was installed using the root user./);
        }
    });

    it('shows special message for root installs, but doesn\'t exit on `start`', function () {
        const osStub = sinon.stub(os, 'platform').returns('linux');
        const cwdStub = sinon.stub(process, 'cwd').returns('/var/www/ghost');
        const fsStub = sinon.stub(fs, 'existsSync');
        const fsStatStub = sinon.stub(fs, 'statSync').returns({uid: 0});
        const processStub = sinon.stub(process, 'getuid').returns(0);
        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

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
        expect(errorStub.args[0][0]).to.match(/It looks like Ghost was installed using the root user./);
    });

    it('throws error command run with root for non-root installs', function () {
        const osStub = sinon.stub(os, 'platform').returns('linux');
        const cwdStub = sinon.stub(process, 'cwd').returns('/var/www/ghost');
        const fsStub = sinon.stub(fs, 'existsSync');
        const fsStatStub = sinon.stub(fs, 'statSync').returns({uid: 501});
        const processStub = sinon.stub(process, 'getuid').returns(0);
        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

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
            expect(errorStub.args[0][0]).to.match(/You can't run commands as the 'root' user/);
        }
    });

    it('throws error command run with root outside of valid ghost installation', function () {
        const osStub = sinon.stub(os, 'platform').returns('linux');
        const cwdStub = sinon.stub(process, 'cwd').returns('/var/www/');
        const fsStub = sinon.stub(fs, 'existsSync');
        const fsStatStub = sinon.stub(fs, 'statSync').returns({uid: 501});
        const processStub = sinon.stub(process, 'getuid').returns(0);
        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

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
            expect(errorStub.args[0][0]).to.match(/You can't run commands as the 'root' user/);
        }
    });
});
