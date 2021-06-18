const fs = require('fs');
const {expect} = require('chai');
const sinon = require('sinon');

const discoverEnvs = require('../../../lib/utils/discover-envs');

it('Unit > Discover Environments', function () {
    after(() => sinon.restore());

    const doTest = (dummyFileList, expectedFileList, context) => {
        sinon.restore();
        const stub = sinon.stub(fs, 'readdirSync').returns(dummyFileList);
        expect(discoverEnvs('/path/to/install'), context).to.deep.equal(expectedFileList);
        expect(stub.calledWithExactly('/path/to/install')).to.be.true;
    };

    doTest(
        ['content', 'versions', 'config.example.json', 'config.development.json', 'config.production.json'],
        ['production', 'development', 'example']
    );

    doTest(
        ['content', 'versions', 'config.mysql.json'],
        ['mysql']
    );

    doTest(
        ['content', 'versions', 'config.production.json', 'config.development.json', 'config.runme.json'],
        ['production', 'development', 'runme']
    );

    doTest(['content', 'versions'], []);
});
