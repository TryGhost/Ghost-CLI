const {expect} = require('chai');
const nock = require('nock');
const path = require('path');
const tmp = require('tmp');
const fs = require('fs-extra');

const {SystemError} = require('../../../../lib/errors');
const {getBaseUrl, isSetup, setup, runImport, downloadExport} = require('../../../../lib/tasks/import/api');

const testUrl = 'http://localhost:2368';

describe('Unit > Tasks > Import > setup', function () {
    describe('getBaseUrl', function () {
        it('1.x', function () {
            const baseUrl = getBaseUrl('1.0.0', 'https://example.com/');
            expect(baseUrl).to.equal('https://example.com/ghost/api/v0.1');
        });

        it('2.x', function () {
            const baseUrl = getBaseUrl('2.0.0', 'https://example.com/');
            expect(baseUrl).to.equal('https://example.com/ghost/api/v2/admin');
        });

        it('3.x', function () {
            const baseUrl = getBaseUrl('3.0.0', 'https://example.com/');
            expect(baseUrl).to.equal('https://example.com/ghost/api/v3/admin');
        });

        it('unsupported', function () {
            try {
                getBaseUrl('0.11.14', 'https://example.com');
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.equal('Unsupported version: 0.11.14');
                return;
            }

            expect.fail('getBaseUrl should have thrown an error');
        });
    });

    it('isSetup', async function () {
        const scope = nock(testUrl)
            .get('/ghost/api/v3/admin/authentication/setup/')
            .reply(200, {setup: [{status: true}]});

        const result = await isSetup('3.0.0', testUrl);
        expect(result).to.be.true;
        expect(scope.isDone()).to.be.true;
    });

    it('setup', async function () {
        const data = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password',
            blogTitle: 'Test Blog'
        };

        const scope = nock(testUrl)
            .post('/ghost/api/v3/admin/authentication/setup/', {setup: [data]})
            .reply(201, {});

        await setup('3.0.0', testUrl, data);
        expect(scope.isDone()).to.be.true;
    });

    describe('runImport', function () {
        it('1.x', async function () {
            const clientId = 'client-id';
            const clientSecret = 'client-secret';
            const configBody = {
                configuration: [{
                    clientId, clientSecret
                }]
            };

            const tokenRequestBody = {
                grant_type: 'password',
                client_id: clientId,
                client_secret: clientSecret,
                username: 'test@example.com',
                password: 'password'
            };

            const tokenResponseBody = {
                access_token: 'access-token'
            };

            const configScope = nock(testUrl)
                .get('/ghost/api/v0.1/configuration/')
                .reply(200, configBody);

            const tokenScope = nock(testUrl)
                .post('/ghost/api/v0.1/authentication/token/', tokenRequestBody)
                .reply(201, tokenResponseBody);

            const importScope = nock(testUrl, {
                reqheaders: {
                    Authorization: 'Bearer access-token'
                }
            }).post('/ghost/api/v0.1/db/').reply(200, {});

            await runImport('1.0.0', testUrl, {
                username: 'test@example.com',
                password: 'password'
            }, path.join(__dirname, 'fixtures/0.11.x.json'));

            expect(configScope.isDone()).to.be.true;
            expect(tokenScope.isDone()).to.be.true;
            expect(importScope.isDone()).to.be.true;
        });

        it('handles 404 auth error', async function () {
            const clientId = 'client-id';
            const clientSecret = 'client-secret';
            const configBody = {
                configuration: [{
                    clientId, clientSecret
                }]
            };

            const tokenRequestBody = {
                grant_type: 'password',
                client_id: clientId,
                client_secret: clientSecret,
                username: 'test@example.com',
                password: 'password'
            };

            const configScope = nock(testUrl)
                .get('/ghost/api/v0.1/configuration/')
                .reply(200, configBody);

            const tokenScope = nock(testUrl)
                .post('/ghost/api/v0.1/authentication/token/', tokenRequestBody)
                .reply(404, {});

            const importScope = nock(testUrl, {
                reqheaders: {
                    Authorization: 'Bearer access-token'
                }
            }).post('/ghost/api/v0.1/db/').reply(200, {});

            try {
                await runImport('1.0.0', testUrl, {
                    username: 'test@example.com',
                    password: 'password'
                }, path.join(__dirname, 'fixtures/0.11.x.json'));
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.equal('There is no user with that email address.');
                expect(configScope.isDone()).to.be.true;
                expect(tokenScope.isDone()).to.be.true;
                expect(importScope.isDone()).to.be.false;
                return;
            }

            expect.fail('runImport should have errored');
        });

        it('2.x', async function () {
            const sessionScope = nock(testUrl, {
                reqheaders: {
                    Origin: testUrl
                }
            }).post('/ghost/api/v2/admin/session/', {
                username: 'test@example.com',
                password: 'password'
            }).reply(201, 'Success', {
                'Set-Cookie': 'ghost-admin-api-session=test-session-data; Path=/ghost; HttpOnly; Secure; Expires=Tue, 31 Dec 2099 23:59:59 GMT;'
            });

            const importScope = nock(testUrl, {
                reqheaders: {
                    cookie: [
                        'ghost-admin-api-session=test-session-data'
                    ],
                    origin: testUrl
                }
            }).post('/ghost/api/v2/admin/db/').reply(201, {});

            await runImport('2.0.0', 'http://localhost:2368', {
                username: 'test@example.com',
                password: 'password'
            }, path.join(__dirname, 'fixtures/2.x.json'));

            expect(sessionScope.isDone()).to.be.true;
            expect(importScope.isDone()).to.be.true;
        });

        it('handles 422 auth error', async function () {
            const sessionScope = nock(testUrl, {
                reqheaders: {
                    Origin: testUrl
                }
            }).post('/ghost/api/v2/admin/session/', {
                username: 'test@example.com',
                password: 'password'
            }).reply(422, 'Error');

            const importScope = nock(testUrl, {
                reqheaders: {
                    cookie: [
                        'ghost-admin-api-session=test-session-data'
                    ],
                    origin: testUrl
                }
            }).post('/ghost/api/v2/admin/db/').reply(201, {});

            try {
                await runImport('2.0.0', 'http://localhost:2368', {
                    username: 'test@example.com',
                    password: 'password'
                }, path.join(__dirname, 'fixtures/2.x.json'));
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.equal('Your password is incorrect.');
                expect(sessionScope.isDone()).to.be.true;
                expect(importScope.isDone()).to.be.false;
                return;
            }

            expect.fail('runImport should have errored');
        });

        it('3.x', async function () {
            const sessionScope = nock(testUrl, {
                reqheaders: {
                    Origin: testUrl
                }
            }).post('/ghost/api/v3/admin/session/', {
                username: 'test@example.com',
                password: 'password'
            }).reply(201, 'Success', {
                'Set-Cookie': 'ghost-admin-api-session=test-session-data; Path=/ghost; HttpOnly; Secure; Expires=Tue, 31 Dec 2099 23:59:59 GMT;'
            });

            const importScope = nock(testUrl, {
                reqheaders: {
                    cookie: [
                        'ghost-admin-api-session=test-session-data'
                    ],
                    origin: testUrl
                }
            }).post('/ghost/api/v3/admin/db/').reply(201, {});

            await runImport('3.0.0', 'http://localhost:2368', {
                username: 'test@example.com',
                password: 'password'
            }, path.join(__dirname, 'fixtures/3.x.json'));

            expect(sessionScope.isDone()).to.be.true;
            expect(importScope.isDone()).to.be.true;
        });

        it('rethrows non-auth errors', async function () {
            const sessionScope = nock(testUrl, {
                reqheaders: {
                    Origin: testUrl
                }
            }).post('/ghost/api/v3/admin/session/', {
                username: 'test@example.com',
                password: 'password'
            }).reply(500, 'Error');

            const importScope = nock(testUrl, {
                reqheaders: {
                    cookie: [
                        'ghost-admin-api-session=test-session-data'
                    ],
                    origin: testUrl
                }
            }).post('/ghost/api/v3/admin/db/').reply(201, {});

            try {
                await runImport('3.0.0', 'http://localhost:2368', {
                    username: 'test@example.com',
                    password: 'password'
                }, path.join(__dirname, 'fixtures/3.x.json'));
            } catch (error) {
                expect(error.response).to.exist;
                expect(error.response.statusCode).to.equal(500);
                expect(sessionScope.isDone()).to.be.true;
                expect(importScope.isDone()).to.be.false;
                return;
            }

            expect.fail('runImport should have errored');
        });
    });

    describe('downloadExport', function () {
        it('1.x', async function () {
            const clientId = 'client-id';
            const clientSecret = 'client-secret';
            const configBody = {
                configuration: [{
                    clientId, clientSecret
                }]
            };

            const tokenRequestBody = {
                grant_type: 'password',
                client_id: clientId,
                client_secret: clientSecret,
                username: 'test@example.com',
                password: 'password'
            };

            const tokenResponseBody = {
                access_token: 'access-token'
            };

            const configScope = nock(testUrl)
                .get('/ghost/api/v0.1/configuration/')
                .reply(200, configBody);

            const tokenScope = nock(testUrl)
                .post('/ghost/api/v0.1/authentication/token/', tokenRequestBody)
                .reply(201, tokenResponseBody);

            const exportData = {
                db: [{
                    meta: {
                        version: '1.0.0'
                    },
                    data: {
                        users: []
                    }
                }]
            };
            const exportScope = nock(testUrl, {
                reqheaders: {
                    Authorization: 'Bearer access-token'
                }
            }).get('/ghost/api/v0.1/db/').reply(200, exportData);

            const tmpDir = tmp.dirSync();
            const outputFile = path.join(tmpDir.name, '1.x.json');

            await downloadExport('1.0.0', testUrl, {
                username: 'test@example.com',
                password: 'password'
            }, outputFile);

            expect(configScope.isDone()).to.be.true;
            expect(tokenScope.isDone()).to.be.true;
            expect(exportScope.isDone()).to.be.true;
            expect(fs.readJsonSync(outputFile)).to.deep.equal(exportData);
        });

        it('2.x', async function () {
            const sessionScope = nock(testUrl, {
                reqheaders: {
                    Origin: testUrl
                }
            }).post('/ghost/api/v2/admin/session/', {
                username: 'test@example.com',
                password: 'password'
            }).reply(201, 'Success', {
                'Set-Cookie': 'ghost-admin-api-session=test-session-data; Path=/ghost; HttpOnly; Secure; Expires=Tue, 31 Dec 2099 23:59:59 GMT;'
            });

            const exportData = {
                db: [{
                    meta: {
                        version: '2.0.0'
                    },
                    data: {
                        users: []
                    }
                }]
            };
            const exportScope = nock(testUrl, {
                reqheaders: {
                    cookie: [
                        'ghost-admin-api-session=test-session-data'
                    ],
                    origin: testUrl
                }
            }).get('/ghost/api/v2/admin/db/').reply(200, exportData);

            const tmpDir = tmp.dirSync();
            const outputFile = path.join(tmpDir.name, '2.x.json');

            await downloadExport('2.0.0', 'http://localhost:2368', {
                username: 'test@example.com',
                password: 'password'
            }, outputFile);

            expect(sessionScope.isDone()).to.be.true;
            expect(exportScope.isDone()).to.be.true;
            expect(fs.readJsonSync(outputFile)).to.deep.equal(exportData);
        });

        it('3.x', async function () {
            const sessionScope = nock(testUrl, {
                reqheaders: {
                    Origin: testUrl
                }
            }).post('/ghost/api/v3/admin/session/', {
                username: 'test@example.com',
                password: 'password'
            }).reply(201, 'Success', {
                'Set-Cookie': 'ghost-admin-api-session=test-session-data; Path=/ghost; HttpOnly; Secure; Expires=Tue, 31 Dec 2099 23:59:59 GMT;'
            });

            const exportData = {
                db: [{
                    meta: {
                        version: '3.0.0'
                    },
                    data: {
                        users: []
                    }
                }]
            };
            const exportScope = nock(testUrl, {
                reqheaders: {
                    cookie: [
                        'ghost-admin-api-session=test-session-data'
                    ],
                    origin: testUrl
                }
            }).get('/ghost/api/v3/admin/db/').reply(200, exportData);

            const tmpDir = tmp.dirSync();
            const outputFile = path.join(tmpDir.name, '3.x.json');

            await downloadExport('3.0.0', 'http://localhost:2368', {
                username: 'test@example.com',
                password: 'password'
            }, outputFile);

            expect(sessionScope.isDone()).to.be.true;
            expect(exportScope.isDone()).to.be.true;
            expect(fs.readJsonSync(outputFile)).to.deep.equal(exportData);
        });
    });
});
