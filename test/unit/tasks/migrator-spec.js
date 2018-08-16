'use strict';
const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const configStub = require('../../utils/config-stub');

const errors = require('../../../lib/errors');

const migratePath = '../../../lib/tasks/migrator';

describe('Unit: Tasks > Migrator', function () {
    describe('migrate', function () {
        it('runs direct command if useGhostUser returns false', function () {
            const config = configStub();
            const execaStub = sinon.stub().resolves();
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            const sudoStub = sinon.stub().resolves();

            return migrator.migrate({instance: {config, dir: '/some-dir'}, ui: {sudo: sudoStub}}).then(() => {
                expect(useGhostUserStub.calledOnce).to.be.true;
                expect(useGhostUserStub.args[0][0]).to.equal('/some-dir/content');
                expect(execaStub.calledOnce).to.be.true;
                expect(sudoStub.called).to.be.false;
            });
        });

        it('runs sudo command if useGhostUser returns true', function () {
            const config = configStub();
            const execaStub = sinon.stub().resolves();
            const useGhostUserStub = sinon.stub().returns(true);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            const sudoStub = sinon.stub().resolves();

            return migrator.migrate({instance: {config, dir: '/some-dir'}, ui: {sudo: sudoStub}}).then(() => {
                expect(useGhostUserStub.calledOnce).to.be.true;
                expect(useGhostUserStub.args[0][0]).to.equal('/some-dir/content');
                expect(execaStub.calledOnce).to.be.false;
                expect(sudoStub.called).to.be.true;
            });
        });

        it('throws config error with db host if database not found', function () {
            const config = configStub();
            const execaStub = sinon.stub().returns(Promise.reject({stderr: 'CODE: ENOTFOUND'}));
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            return migrator.migrate({instance: {config, dir: '/some-dir', system: {environment: 'testing'}}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ConfigError);
                expect(error.options.config).to.have.key('database.connection.host');
            });
        });

        it('throws config error with db user if access denied error', function () {
            const config = configStub();
            const execaStub = sinon.stub().returns(Promise.reject({stderr: 'CODE: ER_ACCESS_DENIED_ERROR'}));
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            return migrator.migrate({instance: {config, dir: '/some-dir', system: {environment: 'testing'}}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ConfigError);
                expect(error.options.config).to.have.all.keys('database.connection.user', 'database.connection.password');
            });
        });

        it('throws system error if sqlite3 error is thrown by knex', function () {
            const config = configStub();
            const execaStub = sinon.stub().returns(Promise.reject({stdout: 'Knex: run\n$ npm install sqlite3 --save\nError:'}));
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            return migrator.migrate({instance: {config, dir: '/some-dir', system: {environment: 'testing'}}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/sqlite3 did not install properly/);
            });
        });

        it('error on `ghost update`', function () {
            const originalArgv = process.argv;

            process.argv = ['node', 'ghost', 'update'];

            const config = configStub();
            const execaStub = sinon.stub().rejects({stderr: 'YA_GOOFED'});
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            return migrator.migrate({instance: {config, dir: '/some-dir', system: {environment: 'testing'}}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
                process.argv = originalArgv;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(error.options.stderr).to.match(/YA_GOOFED/);
                expect(error.options.suggestion).to.eql('ghost update --rollback');
                expect(error.options.help).to.exist;
                process.argv = originalArgv;
            });
        });

        it('error on `ghost setup migrate`', function () {
            const originalArgv = process.argv;

            process.argv = ['node', 'ghost', 'setup', 'migrate'];

            const config = configStub();
            const execaStub = sinon.stub().rejects({stderr: 'YA_GOOFED'});
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            return migrator.migrate({instance: {config, dir: '/some-dir', system: {environment: 'testing'}}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
                process.argv = originalArgv;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(error.options.stderr).to.match(/YA_GOOFED/);
                expect(error.options.suggestion).to.not.exist;
                expect(error.options.help).to.exist;
                process.argv = originalArgv;
            });
        });
    });

    describe('rollback', function () {
        it('runs direct command if useGhostUser returns false', function () {
            const config = configStub();
            const cliConfig = configStub();
            const execaStub = sinon.stub().resolves();
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            const sudoStub = sinon.stub().resolves();

            return migrator.rollback({instance: {config, cliConfig, dir: '/some-dir'}, ui: {sudo: sudoStub}}).then(() => {
                expect(useGhostUserStub.calledOnce).to.be.true;
                expect(useGhostUserStub.args[0][0]).to.equal('/some-dir/content');
                expect(execaStub.calledOnce).to.be.true;
                expect(execaStub.args[0][0]).to.eql('knex-migrator-rollback');
                expect(execaStub.args[0][1]).to.eql(['--force', '--mgpath', '/some-dir/current']);
                expect(sudoStub.called).to.be.false;
            });
        });

        it('forward version option to knex-migrator if blog is on v1', function () {
            const config = configStub();
            const cliConfig = configStub();
            const execaStub = sinon.stub().resolves();
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            const sudoStub = sinon.stub().resolves();

            cliConfig.get.withArgs('active-version').returns('2.0.0');
            cliConfig.get.withArgs('previous-version').returns('1.25.3');

            return migrator.rollback({instance: {config, cliConfig, dir: '/some-dir'}, ui: {sudo: sudoStub}}).then(() => {
                expect(useGhostUserStub.calledOnce).to.be.true;
                expect(useGhostUserStub.args[0][0]).to.equal('/some-dir/content');
                expect(execaStub.calledOnce).to.be.true;
                expect(execaStub.args[0][0]).to.eql('knex-migrator-rollback');
                expect(execaStub.args[0][1]).to.eql(['--force', '--v', '1.25.3', '--mgpath', '/some-dir/current']);
                expect(sudoStub.called).to.be.false;
            });
        });

        it('runs sudo command if useGhostUser returns true', function () {
            const config = configStub();
            const cliConfig = configStub();
            const execaStub = sinon.stub().resolves();
            const useGhostUserStub = sinon.stub().returns(true);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            const sudoStub = sinon.stub().resolves();

            return migrator.rollback({instance: {config, cliConfig, dir: '/some-dir'}, ui: {sudo: sudoStub}}).then(() => {
                expect(useGhostUserStub.calledOnce).to.be.true;
                expect(useGhostUserStub.args[0][0]).to.equal('/some-dir/content');
                expect(execaStub.calledOnce).to.be.false;
                expect(sudoStub.called).to.be.true;
            });
        });

        it('throws config error with db host if database not found', function () {
            const config = configStub();
            const cliConfig = configStub();
            const execaStub = sinon.stub().returns(Promise.reject({stderr: 'CODE: ENOTFOUND'}));
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            return migrator.rollback({instance: {config, cliConfig, dir: '/some-dir', system: {environment: 'testing'}}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ConfigError);
                expect(error.options.config).to.have.key('database.connection.host');
            });
        });

        it('throws config error with db user if access denied error', function () {
            const config = configStub();
            const cliConfig = configStub();
            const execaStub = sinon.stub().returns(Promise.reject({stderr: 'CODE: ER_ACCESS_DENIED_ERROR'}));
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            return migrator.rollback({instance: {config, cliConfig, dir: '/some-dir', system: {environment: 'testing'}}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ConfigError);
                expect(error.options.config).to.have.all.keys('database.connection.user', 'database.connection.password');
            });
        });

        it('throws system error if sqlite3 error is thrown by knex', function () {
            const config = configStub();
            const cliConfig = configStub();
            const execaStub = sinon.stub().returns(Promise.reject({stdout: 'Knex: run\n$ npm install sqlite3 --save\nError:'}));
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            return migrator.rollback({instance: {config, cliConfig, dir: '/some-dir', system: {environment: 'testing'}}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/sqlite3 did not install properly/);
            });
        });

        it('error on `ghost update --rollback`', function () {
            const originalArgv = process.argv;

            process.argv = ['node', 'ghost', 'update', '--rollback'];

            const config = configStub();
            const cliConfig = configStub();
            const execaStub = sinon.stub().rejects({stderr: 'YA_GOOFED'});
            const useGhostUserStub = sinon.stub().returns(false);

            const migrator = proxyquire(migratePath, {
                execa: execaStub,
                '../utils/use-ghost-user': {shouldUseGhostUser: useGhostUserStub}
            });

            return migrator.rollback({instance: {config, cliConfig, dir: '/some-dir', system: {environment: 'testing'}}}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
                process.argv = originalArgv;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ProcessError);
                expect(error.options.stderr).to.match(/YA_GOOFED/);
                expect(error.options.suggestion).to.eql('ghost update --rollback');
                expect(error.options.help).to.exist;
                process.argv = originalArgv;
            });
        });
    });
});
