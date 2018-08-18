'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const execa = require('execa');
const os = require('os');
const getOS = require('../../../lib/utils/get-os');

describe('Unit: Utils > getOS', function () {
    let platformStub, versionStub, execaStub;

    beforeEach(function () {
        versionStub = sinon.stub(os, 'release');
        execaStub = sinon.stub(execa, 'shellSync');
        platformStub = sinon.stub(os, 'platform');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('returns correct Linux OS', function () {
        platformStub.returns('linux');
        execaStub.withArgs('lsb_release -i -s').returns({stdout: 'Ubuntu'});
        execaStub.withArgs('lsb_release -r -s').returns({stdout: '16'});

        const osResult = getOS({linux: true});
        expect(osResult.os).to.equal('Ubuntu');
        expect(osResult.version).to.equal('16');
        expect(execaStub.calledTwice).to.be.true;
    });

    it('returns correct mac OS', function () {
        platformStub.returns('darwin');
        execaStub.withArgs('sw_vers -productName').returns({stdout: 'Mac OS X'});
        execaStub.withArgs('sw_vers -productVersion').returns({stdout: '10.13.3'});

        const osResult = getOS({macos: true});
        expect(osResult.os).to.equal('Mac OS X');
        expect(osResult.version).to.equal('10.13.3');
        expect(execaStub.calledTwice).to.be.true;
    });

    it('returns correct Windows OS', function () {
        platformStub.returns('win32');
        execaStub.withArgs('ver').returns({stdout: 'Microsoft Windows XP [Version 5.1.2600]'});

        const osResult = getOS({windows: true});
        expect(osResult.os).to.equal('Microsoft Windows XP');
        expect(osResult.version).to.equal('5.1.2600');
        expect(execaStub.calledOnce).to.be.true;
    });

    it('returns default os.platform if OS is not Mac, Linux, or Windows', function () {
        platformStub.returns('freebsd');
        versionStub.returns('1.0.0');
        const osResult = getOS({
            linux: false,
            macos: false,
            windows: false
        });
        expect(osResult.os).to.equal('freebsd');
        expect(osResult.version).to.equal('1.0.0');
        expect(execaStub.calledOnce).to.be.false;
    });

    it('returns default os when syscall fails', function () {
        platformStub.returns('linux');
        versionStub.returns('1.0.0');
        execaStub.throws();

        let osResult = getOS({
            linux: true
        });

        expect(osResult.os).to.equal('linux');
        expect(osResult.version).to.equal('1.0.0');
        expect(execaStub.calledOnce).to.be.true;

        osResult = getOS({
            macos: true
        });

        expect(osResult.os).to.equal('linux');
        expect(osResult.version).to.equal('1.0.0');
        expect(execaStub.calledTwice).to.be.true;

        osResult = getOS({
            windows: true
        });

        expect(osResult.os).to.equal('linux');
        expect(osResult.version).to.equal('1.0.0');
        expect(execaStub.calledThrice).to.be.true;
    });
});
