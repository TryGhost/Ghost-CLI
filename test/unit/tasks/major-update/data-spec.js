'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const errors = require('../../../../lib/errors');

describe('Unit: Tasks > Major Update > Data', function () {
    let knexMock, gscanMock, data, connection;

    beforeEach(function () {
        connection = sinon.stub();
        connection.raw = sinon.stub();
        connection.destroy = sinon.stub().callsFake((cb) => {
            cb();
        });

        knexMock = sinon.stub().returns(connection);

        gscanMock = sinon.stub();
        gscanMock.check = sinon.stub();
        gscanMock.format = sinon.stub();

        knexMock['@noCallThru'] = true;
        gscanMock['@noCallThru'] = true;

        data = proxyquire('../../../../lib/tasks/major-update/data', {
            '/var/www/ghost/versions/2.0.0/node_modules/knex': knexMock,
            '/var/www/ghost/versions/2.0.0/node_modules/gscan': gscanMock
        });
    });

    it('requires `options.dir`', function () {
        return data().catch((err) => {
            expect(err).to.be.an.instanceOf(errors.CliError);
        });
    });

    it('requires `options.database`', function () {
        return data({dir: 'dir'}).catch((err) => {
            expect(err).to.be.an.instanceOf(errors.CliError);
        });
    });

    it('sqlite3: success', function () {
        connection.raw.withArgs('SELECT * FROM settings WHERE `key`="active_theme";').resolves([{value: 'casper'}]);
        connection.raw.withArgs('SELECT uuid FROM posts WHERE slug="v2-demo-post";').resolves([{uuid: 'uuid'}]);

        gscanMock.check.resolves({unformatted: true});
        gscanMock.format.returns({formatted: true});

        return data({
            database: {
                client: 'sqlite3'
            },
            dir: '/var/www/ghost/',
            version: 'versions/2.0.0/'
        }).then((response) => {
            expect(response.gscanReport.formatted).to.be.true;
            expect(response.demoPost.uuid).to.eql('uuid');

            expect(connection.destroy.calledOnce).to.be.true;
            expect(connection.raw.calledTwice).to.be.true;

            expect(gscanMock.check.calledOnce).to.be.true;
            expect(gscanMock.format.calledOnce).to.be.true;

            expect(knexMock.calledOnce).to.be.true;
        });
    });

    it('mysql: success', function () {
        connection.raw.withArgs('SELECT * FROM settings WHERE `key`="active_theme";').resolves([[{value: 'not-casper'}]]);
        connection.raw.withArgs('SELECT uuid FROM posts WHERE slug="v2-demo-post";').resolves([[{uuid: 'uuid'}]]);

        gscanMock.check.resolves({unformatted: true});
        gscanMock.format.returns({formatted: true});

        return data({
            database: {
                client: 'mysql'
            },
            dir: '/var/www/ghost/',
            version: 'versions/2.0.0/'
        }).then((response) => {
            expect(response.gscanReport.formatted).to.be.true;
            expect(response.demoPost.uuid).to.eql('uuid');

            expect(connection.destroy.calledOnce).to.be.true;
            expect(connection.raw.calledTwice).to.be.true;

            expect(gscanMock.check.calledOnce).to.be.true;
            expect(gscanMock.format.calledOnce).to.be.true;

            expect(knexMock.calledOnce).to.be.true;
        });
    });

    it('fails', function () {
        connection.raw.withArgs('SELECT * FROM settings WHERE `key`="active_theme";').resolves([[{value: 'casper'}]]);
        connection.raw.withArgs('SELECT uuid FROM posts WHERE slug="v2-demo-post";').resolves([[{uuid: 'uuid'}]]);

        gscanMock.check.rejects(new Error('oops'));

        return data({
            database: {
                client: 'mysql'
            },
            dir: '/var/www/ghost/',
            version: 'versions/2.0.0/'
        }).then(() => {
            expect('1').to.eql(1, 'Expected error');
        }).catch((err) => {
            expect(err.message).to.eql('oops');
            expect(connection.destroy.calledOnce).to.be.true;
            expect(connection.raw.calledOnce).to.be.true;

            expect(gscanMock.check.calledOnce).to.be.true;
            expect(gscanMock.format.called).to.be.false;

            expect(knexMock.calledOnce).to.be.true;
        });
    });
});
