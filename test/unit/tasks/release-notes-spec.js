const {expect} = require('chai');
const sinon = require('sinon');
const got = require('got');

const runTask = require('../../../lib/tasks/release-notes');

const stubbedGithubResponseWithRelevantFields = () => [{
    tag_name: 'v4.0.1',
    body: '4.0.1 release notes'
}, {
    tag_name: '3.42.2',
    body: '3.42.2 release notes'
}];

describe('Unit: Tasks > Release Notes', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('Discovers releases for < 4.x', async function () {
        const stub = sinon.stub(got, 'get').resolves({body: stubbedGithubResponseWithRelevantFields()});
        const task = {title: 'original'};
        const ui = {log: sinon.stub()};
        const context = {ui, version: '3.42.2'};

        await runTask(context, task);

        expect(stub.calledOnce).to.be.true;
        expect(task.title).to.equal('Fetched release notes');
        expect(ui.log.args[0]).to.deep.equal(['\n3.42.2 release notes\n', 'green']);
    });

    it('Discovers release for >= 4.x', async function () {
        const stub = sinon.stub(got, 'get').resolves({body: stubbedGithubResponseWithRelevantFields()});
        const task = {title: 'original'};
        const ui = {log: sinon.stub()};
        const context = {ui, version: '4.0.1'};

        await runTask(context, task);

        expect(stub.calledOnce).to.be.true;
        expect(task.title).to.equal('Fetched release notes');
        expect(ui.log.args[0]).to.deep.equal(['\n4.0.1 release notes\n', 'green']);
    });

    it('Complains when there are no release notes', async function () {
        const stub = sinon.stub(got, 'get').resolves({body: stubbedGithubResponseWithRelevantFields()});
        const task = {title: 'original'};
        const ui = {log: sinon.stub()};
        const context = {ui, version: '3.14.15'};

        await runTask(context, task);

        expect(stub.calledOnce).to.be.true;
        expect(task.title).to.equal('Release notes were not found');
    });

    it('Handles network errors', async function () {
        const stub = sinon.stub(got, 'get').rejects(new Error('What is this "GitHub" you speak of?'));
        const task = {title: 'original'};
        const ui = {log: sinon.stub()};
        const context = {ui, version: '3.14.15'};

        await runTask(context, task);

        expect(stub.calledOnce).to.be.true;
        expect(task.title).to.equal('Unable to fetch release notes');
    });
});
