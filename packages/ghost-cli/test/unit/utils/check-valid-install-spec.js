// @ts-check

const expect = require('chai').expect;
const sinon = require('sinon');
const checkValidInstall = require('../../../lib/utils/check-valid-install');

const fs = require('fs-extra');

describe('Unit: Utils > checkValidInstall', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('fails when config.js present', function () {
        const existsStub = sinon.stub(fs, 'existsSync');
        existsStub.withArgs(sinon.match(/config\.js/)).returns(true);

        const errorStub = sinon.stub(console, 'error');

        expect(checkValidInstall('test')).to.equal(false);
        expect(existsStub.calledOnce).to.be.true;
        expect(errorStub.calledOnce).to.be.true;
        expect(existsStub.args[0][0]).to.match(/config\.js/);
        expect(errorStub.args[0][0]).to.match(/Ghost-CLI only works with Ghost versions >= 1\.0\.0/);
    });

    it('fails within a Ghost git clone', function () {
        const existsStub = sinon.stub(fs, 'existsSync');
        const readJsonStub = sinon.stub(fs, 'readJsonSync');

        existsStub.withArgs(sinon.match(/config\.js/)).returns(false);
        existsStub.withArgs(sinon.match(/package\.json/)).returns(true);
        existsStub.withArgs(sinon.match(/Gruntfile\.js/)).returns(true);
        readJsonStub.returns({name: 'ghost'});

        const errorStub = sinon.stub(console, 'error');

        expect(checkValidInstall('test')).to.equal(false);
        expect(existsStub.calledThrice).to.be.true;
        expect(errorStub.calledOnce).to.be.true;
        expect(existsStub.args[1][0]).to.match(/package\.json/);
        expect(errorStub.args[0][0]).to.match(/Ghost-CLI commands do not work inside of a git clone/);
    });

    it('neither passes nor fails when .ghost-cli file is missing', function () {
        const existsStub = sinon.stub(fs, 'existsSync');

        existsStub.withArgs(sinon.match(/config\.js/)).returns(false);
        existsStub.withArgs(sinon.match(/package\.json/)).returns(false);
        existsStub.withArgs(sinon.match(/\.ghost-cli/)).returns(false);

        expect(checkValidInstall('test')).to.equal(null);
        expect(existsStub.calledThrice).to.be.true;
        expect(existsStub.args[2][0]).to.match(/\.ghost-cli/);
    });

    it('passes in "valid" installation', function () {
        const existsStub = sinon.stub(fs, 'existsSync');

        existsStub.withArgs(sinon.match(/config\.js/)).returns(false);
        existsStub.withArgs(sinon.match(/package\.json/)).returns(false);
        existsStub.withArgs(sinon.match(/\.ghost-cli/)).returns(true);

        const errorStub = sinon.stub(console, 'error');

        expect(checkValidInstall('test')).to.equal(true);
        expect(existsStub.calledThrice).to.be.true;
        expect(errorStub.called).to.be.false;
    });
});
