const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const Promise = require('bluebird');
const createConfigStub = require('../../../utils/config-stub');

const {SystemError} = require('../../../../lib/errors');
const {TOKEN_AUTH_MIN_VERSION} = require('../../../../lib/tasks/import/api');

const modulePath = '../../../../lib/tasks/import/tasks';

describe('Unit: Tasks > Import > Tasks', function () {
    afterEach(function () {
        delete process.env.GHOST_CLI_STAFF_AUTH_TOKEN;
    });

    describe('importTask', function () {
        it('works with already set up blog', async function () {
            const parseExport = sinon.stub().returns({data: {name: 'test', email: 'test@example.com', blogTitle: 'test'}});
            const isSetup = sinon.stub().resolves(true);
            const setup = sinon.stub().resolves();
            const runImport = sinon.stub().resolves();

            const {importTask} = proxyquire(modulePath, {
                './parse-export': parseExport,
                './api': {isSetup, setup, runImport}
            });

            const prompt = sinon.stub().resolves({username: 'setup@example.com', password: '1234567890'});
            const listr = sinon.stub().callsFake(tasks => Promise.each(tasks, async (t) => {
                if (t.enabled && !t.enabled()) {
                    return;
                }

                await t.task();
            }));
            const config = createConfigStub();
            config.get.withArgs('url').returns('http://localhost:2368');

            await importTask({prompt, listr}, {config, version: '1.0.0'}, 'test-export.json');

            expect(parseExport.calledOnceWithExactly('test-export.json')).to.be.true;
            expect(isSetup.calledOnceWithExactly('1.0.0', 'http://localhost:2368')).to.be.true;
            expect(prompt.calledOnce).to.be.true;
            expect(prompt.args[0][0]).to.have.length(2);

            const usernamePrompt = prompt.args[0][0][0];
            const passwordPrompt = prompt.args[0][0][1];

            expect(usernamePrompt.validate('test@example.com')).to.be.true;
            expect(usernamePrompt.validate('not an email')).to.include('valid email');
            expect(passwordPrompt.validate('1234567890')).to.be.true;
            expect(passwordPrompt.validate('short')).to.include('10 characters long');

            expect(listr.calledOnce).to.be.true;
            expect(setup.called).to.be.false;
            expect(runImport.calledOnceWithExactly('1.0.0', 'http://localhost:2368', {
                username: 'setup@example.com',
                password: '1234567890'
            }, 'test-export.json')).to.be.true;
        });

        it('works with not setup blog', async function () {
            const parseExport = sinon.stub().returns({data: {name: 'test', email: 'test@example.com', blogTitle: 'test'}});
            const isSetup = sinon.stub().resolves(false);
            const setup = sinon.stub().resolves();
            const runImport = sinon.stub().resolves();

            const {importTask} = proxyquire(modulePath, {
                './parse-export': parseExport,
                './api': {isSetup, setup, runImport}
            });

            const prompt = sinon.stub().resolves({password: '1234567890'});
            const listr = sinon.stub().callsFake(tasks => Promise.each(tasks, async (t) => {
                if (t.enabled && !t.enabled()) {
                    return;
                }

                await t.task();
            }));
            const config = createConfigStub();
            config.get.withArgs('url').returns('http://localhost:2368');

            await importTask({prompt, listr}, {config, version: '1.0.0'}, 'test-export.json');

            expect(parseExport.calledOnceWithExactly('test-export.json')).to.be.true;
            expect(isSetup.calledOnceWithExactly('1.0.0', 'http://localhost:2368')).to.be.true;
            expect(prompt.calledOnce).to.be.true;
            expect(prompt.args[0][0]).to.have.length(1);
            expect(listr.calledOnce).to.be.true;
            expect(setup.calledOnceWithExactly('1.0.0', 'http://localhost:2368', {
                name: 'test',
                email: 'test@example.com',
                blogTitle: 'test',
                password: '1234567890'
            })).to.be.true;
            expect(runImport.calledOnceWithExactly('1.0.0', 'http://localhost:2368', {
                username: 'test@example.com',
                password: '1234567890'
            }, 'test-export.json')).to.be.true;
        });
    });

    describe('exportTask', function () {
        it('throws error for not set up blog', async function () {
            const isSetup = sinon.stub().resolves(false);
            const config = createConfigStub();

            config.get.withArgs('url').returns('http://localhost:2368');

            const {exportTask} = proxyquire(modulePath, {
                './api': {isSetup}
            });

            try {
                await exportTask({}, {config, version: '1.0.0'}, 'test-export.json');
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.include('Cannot export content');
                expect(isSetup.calledOnceWithExactly('1.0.0', 'http://localhost:2368')).to.be.true;
                return;
            }

            expect.fail('exportTask should have errored');
        });

        it('exports content', async function () {
            const isSetup = sinon.stub().resolves(true);
            const downloadContentExport = sinon.stub().resolves();
            const config = createConfigStub();
            const prompt = sinon.stub().resolves({username: 'username', password: 'password'});

            config.get.withArgs('url').returns('http://localhost:2368');

            const {exportTask} = proxyquire(modulePath, {
                './api': {TOKEN_AUTH_MIN_VERSION, isSetup, downloadContentExport}
            });

            await exportTask({prompt}, {config, version: '1.0.0'}, 'test-export.json');
            expect(isSetup.calledOnceWithExactly('1.0.0', 'http://localhost:2368')).to.be.true;
            expect(prompt.calledOnce).to.be.true;
            expect(prompt.args[0][0].map(prompt => prompt.name)).to.deep.equal(['username', 'password']);
            expect(downloadContentExport.calledOnceWithExactly('1.0.0', 'http://localhost:2368', {
                username: 'username', password: 'password'
            }, 'test-export.json'));
        });

        it(`errors from >=v5.118.0 to <${TOKEN_AUTH_MIN_VERSION} when device verification is enabled`, async function () {
            for (const configVariant of [undefined, true]) {
                for (const version of ['5.118.0', '5.120.4']) {
                    const isSetup = sinon.stub().resolves(true);
                    const downloadContentExport = sinon.stub().resolves();
                    const config = createConfigStub();
                    const prompt = sinon.stub().rejects(new Error('Should not have been called'));

                    config.get.withArgs('url').returns('http://localhost:2368');
                    config.get.withArgs('security.staffDeviceVerification').returns(configVariant);

                    const {exportTask} = proxyquire(modulePath, {
                        './api': {TOKEN_AUTH_MIN_VERSION, isSetup, downloadContentExport}
                    });

                    try {
                        await exportTask({prompt}, {config, version}, 'test-export.json');
                        expect.fail('exportTask should have errored');
                    } catch (error) {
                        expect(error.message).to.contain(
                            'Staff Device Verification is enabled, so backups might fail with password auth.'
                        );
                    }
                }
            }
        });

        it(`allows >=v5.118.0 to <${TOKEN_AUTH_MIN_VERSION} when device verification is disabled`, async function () {
            for (const configVariant of [false, 'false']) {
                for (const version of ['5.118.0', '5.120.4']) {
                    const isSetup = sinon.stub().resolves(true);
                    const downloadContentExport = sinon.stub().resolves();
                    const config = createConfigStub();
                    const prompt = sinon.stub().resolves({username: 'username', password: 'password'});

                    config.get.withArgs('url').returns('http://localhost:2368');
                    config.get.withArgs('security.staffDeviceVerification').returns(configVariant);

                    const {exportTask} = proxyquire(modulePath, {
                        './api': {TOKEN_AUTH_MIN_VERSION, isSetup, downloadContentExport}
                    });

                    await exportTask({prompt}, {config, version}, 'test-export.json');
                    expect(isSetup.calledOnceWithExactly(version, 'http://localhost:2368')).to.be.true;
                    expect(prompt.calledOnce).to.be.true;
                    expect(prompt.args[0][0].map(prompt => prompt.name)).to.deep.equal(['username', 'password']);
                    expect(downloadContentExport.calledOnceWithExactly('1.0.0', 'http://localhost:2368', {
                        username: 'username', password: 'password'
                    }, 'test-export.json'));
                }
            }
        });

        it(`prompts for a staff auth token on >=${TOKEN_AUTH_MIN_VERSION}`, async function () {
            const isSetup = sinon.stub().resolves(true);
            const downloadContentExport = sinon.stub().resolves();
            const config = createConfigStub();
            const prompt = sinon.stub().resolves({token: 'abcd'});

            config.get.withArgs('url').returns('http://localhost:2368');

            const {exportTask} = proxyquire(modulePath, {
                './api': {TOKEN_AUTH_MIN_VERSION, isSetup, downloadContentExport}
            });

            await exportTask({prompt}, {config, version: TOKEN_AUTH_MIN_VERSION}, 'test-export.json');
            expect(isSetup.calledOnceWithExactly(TOKEN_AUTH_MIN_VERSION, 'http://localhost:2368')).to.be.true;
            expect(prompt.calledOnce).to.be.true;
            expect(prompt.args[0][0].map(prompt => prompt.name)).to.deep.equal(['token']);
            expect(downloadContentExport.calledOnceWithExactly('1.0.0', 'http://localhost:2368', {
                token: 'abcd'
            }, 'test-export.json'));
        });

        it(`uses defined GHOST_CLI_STAFF_AUTH_TOKEN env var >=${TOKEN_AUTH_MIN_VERSION}`, async function () {
            const isSetup = sinon.stub().resolves(true);
            const downloadContentExport = sinon.stub().resolves();
            const config = createConfigStub();
            const prompt = sinon.stub().resolves({token: 'abcd'});

            config.get.withArgs('url').returns('http://localhost:2368');

            const {exportTask} = proxyquire(modulePath, {
                './api': {TOKEN_AUTH_MIN_VERSION, isSetup, downloadContentExport}
            });

            const token = ''.padStart(24, '0') + ':' + ''.padStart(64, '0');
            process.env.GHOST_CLI_STAFF_AUTH_TOKEN = token;

            await exportTask({prompt}, {config, version: TOKEN_AUTH_MIN_VERSION}, 'test-export.json');
            expect(isSetup.calledOnceWithExactly(TOKEN_AUTH_MIN_VERSION, 'http://localhost:2368')).to.be.true;
            expect(prompt.called).to.be.false;
            expect(downloadContentExport.calledOnceWithExactly('1.0.0', 'http://localhost:2368', {
                token
            }, 'test-export.json'));
        });

        it(`throws error on invalid GHOST_CLI_STAFF_AUTH_TOKEN env var >=${TOKEN_AUTH_MIN_VERSION}`, async function () {
            const isSetup = sinon.stub().resolves(true);
            const downloadContentExport = sinon.stub().resolves();
            const config = createConfigStub();
            const prompt = sinon.stub().resolves({token: 'abcd'});

            config.get.withArgs('url').returns('http://localhost:2368');

            const {exportTask} = proxyquire(modulePath, {
                './api': {TOKEN_AUTH_MIN_VERSION, isSetup, downloadContentExport}
            });

            process.env.GHOST_CLI_STAFF_AUTH_TOKEN = 'invalid-token';
            await expect(
                exportTask({prompt}, {config, version: TOKEN_AUTH_MIN_VERSION}, 'test-export.json')
            ).to.be.rejectedWith('GHOST_CLI_STAFF_AUTH_TOKEN is not a valid token');
            expect(isSetup.calledOnceWithExactly(TOKEN_AUTH_MIN_VERSION, 'http://localhost:2368')).to.be.true;
            expect(prompt.called).to.be.false;
            expect(downloadContentExport.called).to.be.false;
        });
    });
});
