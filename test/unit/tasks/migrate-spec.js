'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const errors = require('../../../lib/errors');

const migratePath = '../../../lib/tasks/migrate';

// Used for testing
class TestError extends Error {
    constructor(code) {
        super('an error');
        this.code = code;
    }
}

function getConfigStub(noContentPath) {
    let config = {
        get: sinon.stub(),
        set: sinon.stub().returnsThis(),
        has: sinon.stub(),
        save: sinon.stub().returnsThis()
    };

    config.has.withArgs('paths.contentPath').returns(!noContentPath);
    return config;
}

describe('Unit: Tasks > Migrate', function () {
    it('sets content path if it does not exist', function () {
        let config = getConfigStub(true);
        let migrate = proxyquire(migratePath, {
            'knex-migrator': class KnexMigrator {
                isDatabaseOK() { return Promise.resolve() }
            }
        });

        migrate({ instance: { config: config, dir: '/test/' } }).then(() => {
            expect(config.has.calledOnce).to.be.true;
            expect(config.set.called).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['paths.contentPath', '/test/content']);
            expect(config.save.called).to.be.true;
        });
    });

    it('disables stdout log in config and re-enables it after completion', function () {
        let config = getConfigStub();
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file']);
        let dbOkStub = sinon.stub().resolves();

        let migrate = proxyquire(migratePath, {
            'knex-migrator': class KnexMigrator {
                isDatabaseOK() { return dbOkStub(); }
            }
        });

        return migrate({ instance: { config: config } }).then(() => {
            expect(dbOkStub.calledOnce).to.be.true;
            expect(config.get.calledOnce).to.be.true;
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['logging.transports', []]);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
            expect(config.save.calledTwice).to.be.true;
        });
    });

    it('runs init if database is not initialized', function () {
        let config = getConfigStub();
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file'])
        let dbOkStub = sinon.stub().returns(Promise.reject(new TestError('DB_NOT_INITIALISED')));
        let initStub = sinon.stub().resolves();

        let migrate = proxyquire(migratePath, {
            'knex-migrator': class KnexMigrator {
                isDatabaseOK() { return dbOkStub() }
                init() { return initStub() }
            }
        });

        return migrate({ instance: { config: config } }).then(() => {
            expect(dbOkStub.calledOnce).to.be.true;
            expect(initStub.calledOnce).to.be.true;
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['logging.transports', []]);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
        });
    });

    it('runs init if migration table is missing', function () {
        let config = getConfigStub();
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file'])
        let dbOkStub = sinon.stub().returns(Promise.reject(new TestError('MIGRATION_TABLE_IS_MISSING')));
        let initStub = sinon.stub().resolves();

        let migrate = proxyquire(migratePath, {
            'knex-migrator': class KnexMigrator {
                isDatabaseOK() { return dbOkStub() }
                init() { return initStub() }
            }
        });

        return migrate({ instance: { config: config } }).then(() => {
            expect(dbOkStub.calledOnce).to.be.true;
            expect(initStub.calledOnce).to.be.true;
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['logging.transports', []]);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
        });
    });

    it('runs migrate if db needs migration', function () {
        let config = getConfigStub();
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file']);
        let dbOkStub = sinon.stub().returns(Promise.reject(new TestError('DB_NEEDS_MIGRATION')));
        let migrateStub = sinon.stub().resolves();

        let migrate = proxyquire(migratePath, {
            'knex-migrator': class KnexMigrator {
                isDatabaseOK() { return dbOkStub() }
                migrate() { return migrateStub() }
            }
        });

        return migrate({ instance: { config: config } }).then(() => {
            expect(dbOkStub.calledOnce).to.be.true;
            expect(migrateStub.calledOnce).to.be.true;
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['logging.transports', []]);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
        });
    });

    it('throws config error with db host if database not found', function () {
        let config = getConfigStub();
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file']);
        let dbOkStub = sinon.stub().returns(Promise.reject(new TestError('ENOTFOUND')));

        let migrate = proxyquire(migratePath, {
            'knex-migrator': class KnexMigrator {
                isDatabaseOK() { return dbOkStub() }
            }
        });

        return migrate({ instance: {
            config: config,
            system: { environment: 'testing' }
        } }).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.options.config).to.have.key('database.connection.host');
            expect(dbOkStub.calledOnce).to.be.true;
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['logging.transports', []]);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
        });
    });

    it('throws config error with db user if access denied error', function () {
        let config = getConfigStub();
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file'])
        let dbOkStub = sinon.stub().returns(Promise.reject(new TestError('ER_ACCESS_DENIED_ERROR')));

        let migrate = proxyquire(migratePath, {
            'knex-migrator': class KnexMigrator {
                isDatabaseOK() { return dbOkStub() }
            }
        });

        return migrate({ instance: {
            config: config,
            system: { environment: 'testing' }
        } }).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.options.config).to.have.all.keys('database.connection.user', 'database.connection.password');
            expect(dbOkStub.calledOnce).to.be.true;
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['logging.transports', []]);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
        });
    });
});
