'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const errors = require('../../../lib/errors');

const migratePath = '../../../lib/tasks/migrate';

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
    it('runs direct command if useGhostUser returns false', function () {
        let config = getConfigStub(true);
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file']);
        let execaStub = sinon.stub().resolves();
        let useGhostUserStub = sinon.stub().returns(false);

        let migrate = proxyquire(migratePath, {
            execa: execaStub,
            '../utils/use-ghost-user': useGhostUserStub
        });

        let sudoStub = sinon.stub().resolves();

        return migrate({ instance: { config: config, dir: '/some-dir' }, ui: { sudo: sudoStub } }).then(() => {
            expect(useGhostUserStub.calledOnce).to.be.true;
            expect(useGhostUserStub.args[0][0]).to.equal('/some-dir/content');
            expect(execaStub.calledOnce).to.be.true;
            expect(sudoStub.called).to.be.false;
            expect(config.has.calledOnce).to.be.true;
            expect(config.set.calledThrice).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['paths.contentPath', '/some-dir/content']);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['file']]);
            expect(config.set.args[2]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
            expect(config.save.called).to.be.true;
        });
    });

    it('runs sudo command if useGhostUser returns true', function () {
        let config = getConfigStub();
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file']);
        let execaStub = sinon.stub().resolves();
        let useGhostUserStub = sinon.stub().returns(true);

        let migrate = proxyquire(migratePath, {
            execa: execaStub,
            '../utils/use-ghost-user': useGhostUserStub
        });

        let sudoStub = sinon.stub().resolves();

        return migrate({ instance: { config: config, dir: '/some-dir' }, ui: { sudo: sudoStub } }).then(() => {
            expect(useGhostUserStub.calledOnce).to.be.true;
            expect(useGhostUserStub.args[0][0]).to.equal('/some-dir/content');
            expect(execaStub.calledOnce).to.be.false;
            expect(sudoStub.called).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['logging.transports', ['file']]);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
        });
    });

    it('throws config error with db host if database not found', function () {
        let config = getConfigStub();
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file']);
        let execaStub = sinon.stub().returns(Promise.reject({stderr: 'CODE: ENOTFOUND'}));
        let useGhostUserStub = sinon.stub().returns(false);

        let migrate = proxyquire(migratePath, {
            execa: execaStub,
            '../utils/use-ghost-user': useGhostUserStub
        });

        return migrate({ instance: { config: config, dir: '/some-dir', system: { environment: 'testing' } } }).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.options.config).to.have.key('database.connection.host');
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['logging.transports', ['file']]);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
        });
    });

    it('throws config error with db user if access denied error', function () {
        let config = getConfigStub();
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file']);
        let execaStub = sinon.stub().returns(Promise.reject({stderr: 'CODE: ER_ACCESS_DENIED_ERROR' }));
        let useGhostUserStub = sinon.stub().returns(false);

        let migrate = proxyquire(migratePath, {
            execa: execaStub,
            '../utils/use-ghost-user': useGhostUserStub
        });

        return migrate({ instance: { config: config, dir: '/some-dir', system: { environment: 'testing' } } }).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.options.config).to.have.all.keys('database.connection.user', 'database.connection.password');
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['logging.transports', ['file']]);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
        });
    });

    it('throws system error if sqlite3 error is thrown by knex', function () {
        let config = getConfigStub();
        config.get.withArgs('logging.transports', null).returns(['stdout', 'file']);
        let execaStub = sinon.stub().returns(Promise.reject({stdout: 'Knex: run\n$ npm install sqlite3 --save\nError:'}));
        let useGhostUserStub = sinon.stub().returns(false);

        let migrate = proxyquire(migratePath, {
            execa: execaStub,
            '../utils/use-ghost-user': useGhostUserStub
        });

        return migrate({ instance: {config: config, dir: '/some-dir', system: {environment: 'testing'}}}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.match(/sqlite3 did not install properly/);
            expect(config.set.calledTwice).to.be.true;
            expect(config.set.args[0]).to.deep.equal(['logging.transports', ['file']]);
            expect(config.set.args[1]).to.deep.equal(['logging.transports', ['stdout', 'file']]);
        });
    });
});
