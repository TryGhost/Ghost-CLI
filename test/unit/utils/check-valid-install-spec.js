'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const checkValidInstall = require('../../../lib/utils/check-valid-install');

const fs = require('fs-extra');

describe('Unit: Utils > checkValidInstall', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('throws error if config.js present', function () {
        const existsStub = sinon.stub(fs, 'existsSync');
        existsStub.withArgs(sinon.match(/config\.js/)).returns(true);

        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

        try {
            checkValidInstall('test');
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.not.equal('should not be thrown');
            expect(existsStub.calledOnce).to.be.true;
            expect(errorStub.calledOnce).to.be.true;
            expect(exitStub.calledOnce).to.be.true;
            expect(existsStub.args[0][0]).to.match(/config\.js/);
            expect(errorStub.args[0][0]).to.match(/Ghost-CLI only works with Ghost versions >= 1\.0\.0/);
        }
    });

    it('throws error if within a Ghost git clone', function () {
        const existsStub = sinon.stub(fs, 'existsSync');
        const readJsonStub = sinon.stub(fs, 'readJsonSync');

        existsStub.withArgs(sinon.match(/config\.js/)).returns(false);
        existsStub.withArgs(sinon.match(/package\.json/)).returns(true);
        existsStub.withArgs(sinon.match(/Gruntfile\.js/)).returns(true);
        readJsonStub.returns({name: 'ghost'});

        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

        try {
            checkValidInstall('test');
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.not.equal('should not be thrown');
            expect(existsStub.calledThrice).to.be.true;
            expect(errorStub.calledOnce).to.be.true;
            expect(exitStub.calledOnce).to.be.true;
            expect(existsStub.args[1][0]).to.match(/package\.json/);
            expect(errorStub.args[0][0]).to.match(/Ghost-CLI commands do not work inside of a git clone/);
        }
    });

    it('throws error if above two conditions don\'t exit and .ghost-cli file is missing', function () {
        const existsStub = sinon.stub(fs, 'existsSync');

        existsStub.withArgs(sinon.match(/config\.js/)).returns(false);
        existsStub.withArgs(sinon.match(/package\.json/)).returns(false);
        existsStub.withArgs(sinon.match(/\.ghost-cli/)).returns(false);

        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

        try {
            checkValidInstall('test');
            throw new Error('should not be thrown');
        } catch (e) {
            expect(e.message).to.not.equal('should not be thrown');
            expect(existsStub.calledThrice).to.be.true;
            expect(errorStub.calledOnce).to.be.true;
            expect(exitStub.calledOnce).to.be.true;
            expect(existsStub.args[2][0]).to.match(/\.ghost-cli/);
            expect(errorStub.args[0][0]).to.match(/Working directory is not a recognisable Ghost installation/);
        }
    });

    it('doesn\'t do anything if all conditions return false', function () {
        const existsStub = sinon.stub(fs, 'existsSync');

        existsStub.withArgs(sinon.match(/config\.js/)).returns(false);
        existsStub.withArgs(sinon.match(/package\.json/)).returns(false);
        existsStub.withArgs(sinon.match(/\.ghost-cli/)).returns(true);

        const exitStub = sinon.stub(process, 'exit').throws();
        const errorStub = sinon.stub(console, 'error');

        checkValidInstall('test');
        expect(existsStub.calledThrice).to.be.true;
        expect(errorStub.called).to.be.false;
        expect(exitStub.called).to.be.false;
    });
});
