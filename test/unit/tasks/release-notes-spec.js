const sinon = require('sinon');
const nock = require('nock');

const runTask = require('../../../lib/tasks/release-notes');

const releasesPath = '/repos/TryGhost/Ghost/releases';

const stubbedGithubResponseWithRelevantFields = () => [{
    tag_name: 'v4.0.1',
    name: '4.0.1',
    body: '4.0.1 release notes'
}, {
    tag_name: '3.42.2',
    name: '3.42.2',
    body: '3.42.2 release notes'
}];

function stubGithub() {
    return nock('https://api.github.com')
        .get(releasesPath)
        .reply(200, stubbedGithubResponseWithRelevantFields());
}

describe('Unit: Tasks > Release Notes', function () {
    beforeAll(function () {
        // ky retries failed requests, so an unmocked attempt would otherwise hit the real API
        nock.disableNetConnect();
    });

    afterAll(function () {
        nock.enableNetConnect();
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    it('Discovers releases for < 4.x', async function () {
        const scope = stubGithub();
        const task = {title: 'original'};
        const ui = {log: sinon.stub()};
        const context = {ui, version: '3.42.2'};

        await runTask(context, task);

        expect(scope.isDone()).to.be.true;
        expect(task.title).to.equal('Fetched release notes');
        expect(ui.log.args[0]).to.deep.equal(['\n# 3.42.2\n\n3.42.2 release notes\n', 'green']);
    });

    it('Discovers release for >= 4.x', async function () {
        const scope = stubGithub();
        const task = {title: 'original'};
        const ui = {log: sinon.stub()};
        const context = {ui, version: '4.0.1'};

        await runTask(context, task);

        expect(scope.isDone()).to.be.true;
        expect(task.title).to.equal('Fetched release notes');
        expect(ui.log.args[0]).to.deep.equal(['\n# 4.0.1\n\n4.0.1 release notes\n', 'green']);
    });

    it('Complains when there are no release notes', async function () {
        const scope = stubGithub();
        const task = {title: 'original'};
        const ui = {log: sinon.stub()};
        const context = {ui, version: '3.14.15'};

        await runTask(context, task);

        expect(scope.isDone()).to.be.true;
        expect(task.title).to.equal('Release notes were not found');
    });

    it('Handles network errors', async function () {
        // one interceptor per attempt, so the retries are mocked too
        const scope = nock('https://api.github.com')
            .get(releasesPath)
            .times(3)
            .replyWithError('What is this "GitHub" you speak of?');
        const task = {title: 'original'};
        const ui = {log: sinon.stub()};
        const context = {ui, version: '3.14.15'};

        await runTask(context, task);

        expect(scope.isDone()).to.be.true;
        expect(task.title).to.equal('Unable to fetch release notes');
    });
});
