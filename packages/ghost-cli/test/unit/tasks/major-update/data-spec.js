'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const {CliError} = require('../../../../lib/errors');

describe('Unit: Tasks > Major Update > Data', function () {
    let knexMock, gscanMock, data, connection;

    beforeEach(function () {
        connection = sinon.stub();
        connection.raw = sinon.stub();
        connection.destroy = sinon.stub().resolves();

        knexMock = sinon.stub().returns(connection);

        gscanMock = sinon.stub();
        gscanMock.check = sinon.stub();
        gscanMock.format = sinon.stub();

        knexMock['@noCallThru'] = true;
        gscanMock['@noCallThru'] = true;

        data = proxyquire('../../../../lib/tasks/major-update/data', {
            '/var/www/ghost/versions/2.0.0/node_modules/knex': knexMock,
            '/var/www/ghost/versions/2.0.0/node_modules/gscan': gscanMock,
            '/var/www/ghost/versions/3.0.0/node_modules/knex': knexMock,
            '/var/www/ghost/versions/3.0.0/node_modules/gscan': gscanMock
        });
    });

    it('requires `options.dir`', async function () {
        try {
            await data({});
        } catch (err) {
            expect(err).to.be.an.instanceOf(CliError);
            return;
        }

        expect.fail('should have thrown an error');
    });

    it('requires `options.database`', async function () {
        try {
            await data({dir: 'dir'});
        } catch (err) {
            expect(err).to.be.an.instanceOf(CliError);
            return;
        }

        expect.fail('should have thrown an error');
    });

    it('sqlite3: success', async function () {
        connection.raw.withArgs('SELECT value FROM settings WHERE `key` = "active_theme";').resolves([{value: 'casper'}]);
        connection.raw.withArgs('SELECT uuid FROM posts WHERE `slug` = "v2-demo-post";').resolves([{uuid: 'uuid'}]);

        gscanMock.check.resolves({unformatted: true});
        gscanMock.format.returns({formatted: true});

        const response = await data({
            database: {
                client: 'sqlite3'
            },
            dir: '/var/www/ghost/',
            versionFolder: 'versions/2.0.0/',
            version: '2.0.0'
        });

        expect(response.gscanReport.formatted).to.be.true;
        expect(response.demoPost.uuid).to.eql('uuid');

        expect(connection.destroy.calledOnce).to.be.true;
        expect(connection.raw.calledTwice).to.be.true;

        expect(gscanMock.check.calledOnce).to.be.true;
        expect(gscanMock.check.calledWithExactly(
            '/var/www/ghost/versions/2.0.0/content/themes/casper',
            {checkVersion: 'v2'}
        )).to.be.true;
        expect(gscanMock.format.calledOnce).to.be.true;

        expect(knexMock.calledOnce).to.be.true;
    });

    it('mysql: success', async function () {
        connection.raw.withArgs('SELECT value FROM settings WHERE `key` = "active_theme";').resolves([[{value: 'not-casper'}]]);
        connection.raw.withArgs('SELECT uuid FROM posts WHERE `slug` = "v2-demo-post";').resolves([[{uuid: 'uuid'}]]);

        gscanMock.check.resolves({unformatted: true});
        gscanMock.format.returns({formatted: true});

        const response = await data({
            database: {
                client: 'mysql'
            },
            dir: '/var/www/ghost/',
            versionFolder: 'versions/2.0.0/',
            version: '2.0.0'
        });

        expect(response.gscanReport.formatted).to.be.true;
        expect(response.demoPost.uuid).to.eql('uuid');

        expect(connection.destroy.calledOnce).to.be.true;
        expect(connection.raw.calledTwice).to.be.true;

        expect(gscanMock.check.calledOnce).to.be.true;
        expect(gscanMock.check.calledWithExactly(
            '/var/www/ghost/content/themes/not-casper',
            {checkVersion: 'v2'}
        )).to.be.true;
        expect(gscanMock.format.calledOnce).to.be.true;

        expect(knexMock.calledOnce).to.be.true;
    });

    it('fails', async function () {
        connection.raw.withArgs('SELECT value FROM settings WHERE `key` = "active_theme";').resolves([[{value: 'casper'}]]);
        connection.raw.withArgs('SELECT uuid FROM posts WHERE `slug` = "v2-demo-post";').resolves([[{uuid: 'uuid'}]]);

        gscanMock.check.rejects(new Error('oops'));

        try {
            await data({
                database: {
                    client: 'mysql'
                },
                dir: '/var/www/ghost/',
                versionFolder: 'versions/3.0.0/',
                version: '3.0.0'
            });
        } catch (err) {
            expect(err.message).to.eql('oops');
            expect(connection.destroy.calledOnce).to.be.true;
            expect(connection.raw.calledOnce).to.be.true;

            expect(gscanMock.check.calledOnce).to.be.true;
            expect(gscanMock.check.calledWithExactly(
                '/var/www/ghost/versions/3.0.0/content/themes/casper',
                {checkVersion: 'v3'}
            )).to.be.true;
            expect(gscanMock.format.called).to.be.false;

            expect(knexMock.calledOnce).to.be.true;
            return;
        }

        expect.fail('should have thrown an error');
    });
});
