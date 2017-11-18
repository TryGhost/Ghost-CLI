'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const modulePath = '../index';
const errors = require('../../../lib/errors');

describe('Unit: Mysql extension', function () {
    describe('setup hook', function () {
        const MysqlExtension = require(modulePath);

        it('does not add stage if --local is true', function () {
            const instance = new MysqlExtension({}, {}, {}, '/some/dir');
            const addStageStub = sinon.stub();

            instance.setup({addStage: addStageStub}, {local: true});
            expect(addStageStub.called).to.be.false;
        });

        it('does not add stage if db is sqlite3', function () {
            const instance = new MysqlExtension({}, {}, {}, '/some/dir');
            const addStageStub = sinon.stub();

            instance.setup({addStage: addStageStub}, {local: false, db: 'sqlite3'});
            expect(addStageStub.called).to.be.false;
        });

        it('adds stage if not local and db is not sqlite3', function () {
            const instance = new MysqlExtension({}, {}, {}, '/some/dir');
            const addStageStub = sinon.stub();

            instance.setup({addStage: addStageStub}, {local: false, db: 'mysql'});
            expect(addStageStub.calledOnce).to.be.true;
            expect(addStageStub.calledWith('mysql')).to.be.true;
        });
    });

    describe('setupMySQL', function () {
        const MysqlExtension = require(modulePath);

        it('skips if db user is not root', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({log: logStub}, {}, {}, '/some/dir');
            const getStub = sinon.stub().returns({user: 'notroot'});
            const skipStub = sinon.stub().resolves();

            return instance.setupMySQL({}, {instance: {config: {get: getStub}}}, {skip: skipStub}).then(() => {
                expect(getStub.calledOnce).to.be.true;
                expect(getStub.calledWithExactly('database.connection')).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/user is not "root"/);
                expect(skipStub.calledOnce).to.be.true;
            });
        });

        it('returns tasks that call the helpers and cleanup', function () {
            const listrStub = sinon.stub().callsFake(function (tasks) {
                expect(tasks).to.be.an.instanceof(Array);
                expect(tasks).to.have.length(4);

                // Run each task step
                tasks.forEach(task => task.task());
                return Promise.resolve();
            });
            const instance = new MysqlExtension({listr: listrStub}, {}, {}, '/some/dir');
            const getStub = sinon.stub().returns({user: 'root'});
            const saveStub = sinon.stub();
            const setStub = sinon.stub();
            setStub.returns({set: setStub, save: saveStub});
            const endStub = sinon.stub();
            const skipStub = sinon.stub().resolves();
            const canConnectStub = sinon.stub(instance, 'canConnect');
            const createUserStub = sinon.stub(instance, 'createUser').callsFake((ctx) => {
                ctx.mysql = {username: 'testuser', password: 'testpass'};
            });
            const grantPermissionsStub = sinon.stub(instance, 'grantPermissions');

            instance.connection = {end: endStub};

            return instance.setupMySQL({}, {
                instance: {config: {get: getStub, set: setStub, save: saveStub}}
            }, {skip: skipStub}).then(() => {
                expect(skipStub.called).to.be.false;
                expect(listrStub.calledOnce).to.be.true;
                expect(listrStub.args[0][1]).to.be.false;

                expect(getStub.calledOnce).to.be.true;
                expect(canConnectStub.calledOnce).to.be.true;
                expect(createUserStub.calledOnce).to.be.true;
                expect(grantPermissionsStub.calledOnce).to.be.true;
                expect(setStub.calledTwice).to.be.true;
                expect(setStub.calledWithExactly('database.connection.user', 'testuser')).to.be.true;
                expect(setStub.calledWithExactly('database.connection.password', 'testpass')).to.be.true;
                expect(saveStub.calledOnce).to.be.true;
                expect(endStub.calledOnce).to.be.true;
            });
        });
    });

    describe('canConnect', function () {
        it('creates connection and connects', function () {
            const connectStub = sinon.stub().callsArg(0);
            const createConnectionStub = sinon.stub().returns({connect: connectStub});
            const MysqlExtension = proxyquire(modulePath, {
                mysql: {createConnection: createConnectionStub}
            });
            const instance = new MysqlExtension({}, {}, {}, '/some/dir');

            return instance.canConnect({}, {user: 'someuser', password: 'somepass', database: 'testing'}).then(() => {
                expect(createConnectionStub.calledOnce).to.be.true;
                expect(createConnectionStub.calledWithExactly({user: 'someuser', password: 'somepass'})).to.be.true;
                expect(connectStub.calledOnce).to.be.true;
            });
        });

        it('throws configerror if error is ECONNREFUSED', function () {
            const connectStub = sinon.stub().callsFake((cb) => {
                const error = new Error('db connection failed');
                error.code = 'ECONNREFUSED';
                cb(error);
            });
            const createConnectionStub = sinon.stub().returns({connect: connectStub});
            const MysqlExtension = proxyquire(modulePath, {
                mysql: {createConnection: createConnectionStub}
            });
            const instance = new MysqlExtension({}, {}, {}, '/some/dir');

            return instance.canConnect({}, {}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ConfigError);
                expect(error.message).to.equal('db connection failed');
                expect(createConnectionStub.calledOnce).to.be.true;
                expect(connectStub.calledOnce).to.be.true;
            });
        });

        it('throws configerror if error is ER_ACCESS_DENIED_ERROR', function () {
            const connectStub = sinon.stub().callsFake((cb) => {
                const error = new Error('invalid username/password');
                error.code = 'ER_ACCESS_DENIED_ERROR';
                cb(error);
            });
            const createConnectionStub = sinon.stub().returns({connect: connectStub});
            const MysqlExtension = proxyquire(modulePath, {
                mysql: {createConnection: createConnectionStub}
            });
            const instance = new MysqlExtension({}, {}, {}, '/some/dir');

            return instance.canConnect({}, {}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.ConfigError);
                expect(error.message).to.equal('invalid username/password');
                expect(createConnectionStub.calledOnce).to.be.true;
                expect(connectStub.calledOnce).to.be.true;
            });
        });

        it('throws error if error code does not match expected ones', function () {
            const connectStub = sinon.stub().callsFake((cb) => {
                cb(new Error('ack'));
            });
            const createConnectionStub = sinon.stub().returns({connect: connectStub});
            const MysqlExtension = proxyquire(modulePath, {
                mysql: {createConnection: createConnectionStub}
            });
            const instance = new MysqlExtension({}, {}, {}, '/some/dir');

            return instance.canConnect({}, {}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(Error);
                expect(error.message).to.equal('ack');
                expect(createConnectionStub.calledOnce).to.be.true;
                expect(connectStub.calledOnce).to.be.true;
            });
        });
    });

    describe('createUser', function () {
        const MysqlExtension = require(modulePath);

        it('runs correct queries and logs things', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            const queryStub = sinon.stub(instance, '_query').resolves();
            const ctx = {};

            return instance.createUser(ctx, {host: 'localhost'}).then(() => {
                expect(queryStub.calledThrice).to.be.true;
                expect(queryStub.args[0][0]).to.match(/^CREATE USER 'ghost-[0-9]{1,4}'@'localhost' IDENTIFIED WITH mysql_native_password;$/);
                expect(queryStub.args[1][0]).to.equal('SET old_passwords = 0;');
                expect(queryStub.args[2][0]).to.match(/^SET PASSWORD FOR 'ghost-[0-9]{1,4}'@'localhost' = PASSWORD\('[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*'\);$/);
                expect(logStub.calledThrice).to.be.true;
                expect(logStub.args[0][0]).to.match(/created new user/);
                expect(logStub.args[1][0]).to.match(/disabled old_password/);
                expect(logStub.args[2][0]).to.match(/successfully created password for user/);
                expect(ctx.mysql).to.exist;
                expect(ctx.mysql.username).to.match(/^ghost-[0-9]{1,4}$/);
                expect(ctx.mysql.password).to.match(/^[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*$/);
            });
        });

        it('retries creating user if username already exists', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            const queryStub = sinon.stub(instance, '_query').resolves();
            queryStub.onFirstCall().callsFake(() => {
                const error = new Error();
                error.errno = 1396;
                return Promise.reject(error);
            });
            const ctx = {};

            return instance.createUser(ctx, {host: 'localhost'}).then(() => {
                expect(queryStub.callCount).to.equal(4);
                expect(queryStub.args[0][0]).to.match(/^CREATE USER 'ghost-[0-9]{1,4}'@'localhost' IDENTIFIED WITH mysql_native_password;$/);
                expect(queryStub.args[1][0]).to.match(/^CREATE USER 'ghost-[0-9]{1,4}'@'localhost' IDENTIFIED WITH mysql_native_password;$/);
                expect(queryStub.args[2][0]).to.equal('SET old_passwords = 0;');
                expect(queryStub.args[3][0]).to.match(/^SET PASSWORD FOR 'ghost-[0-9]{1,4}'@'localhost' = PASSWORD\('[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*'\);$/);
                expect(logStub.callCount).to.equal(4);
                expect(logStub.args[0][0]).to.match(/user exists, re-trying user creation/);
                expect(logStub.args[1][0]).to.match(/created new user/);
                expect(logStub.args[2][0]).to.match(/disabled old_password/);
                expect(logStub.args[3][0]).to.match(/successfully created password for user/);
                expect(ctx.mysql).to.exist;
                expect(ctx.mysql.username).to.match(/^ghost-[0-9]{1,4}$/);
                expect(ctx.mysql.password).to.match(/^[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*$/);
            });
        });

        it('rejects with SystemError and ends connection if any query fails', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            const queryStub = sinon.stub(instance, '_query').rejects();
            const endStub = sinon.stub();
            instance.connection = {end: endStub};

            return instance.createUser({}, {host: 'localhost'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/Creating new mysql user errored/);
                expect(queryStub.calledOnce).to.be.true;
                expect(queryStub.args[0][0]).to.match(/^CREATE USER 'ghost-[0-9]{1,4}'@'localhost' IDENTIFIED WITH mysql_native_password;$/);
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/Unable to create custom Ghost user/);
                expect(endStub.calledOnce).to.be.true;
            });
        });
    });

    describe('grantPermissions', function () {
        const MysqlExtension = require(modulePath);

        it('runs correct queries and logs things', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            const queryStub = sinon.stub(instance, '_query').resolves();

            return instance.grantPermissions({mysql: {username: 'testuser'}}, {host: 'localhost', database: 'ghost'}).then(() => {
                expect(queryStub.calledTwice).to.be.true;
                expect(queryStub.calledWithExactly('GRANT ALL PRIVILEGES ON ghost.* TO \'testuser\'@\'localhost\';')).to.be.true;
                expect(queryStub.calledWithExactly('FLUSH PRIVILEGES;')).to.be.true;
                expect(logStub.calledTwice).to.be.true;
                expect(logStub.args[0][0]).to.match(/Successfully granted privileges/);
                expect(logStub.args[1][0]).to.match(/flushed privileges/);
            });
        });

        it('catches any error, logs and ends connection', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            const queryStub = sinon.stub(instance, '_query');
            const endStub = sinon.stub();
            instance.connection = {end: endStub};
            queryStub.onFirstCall().resolves();
            queryStub.onSecondCall().rejects();

            return instance.grantPermissions({mysql: {username: 'test'}}, {host: 'localhost', database: 'ghost'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.SystemError);
                expect(error.message).to.match(/Granting database permissions errored/);
                expect(queryStub.calledTwice).to.be.true;
                expect(logStub.calledTwice).to.be.true;
                expect(logStub.args[0][0]).to.match(/Successfully granted privileges/);
                expect(logStub.args[1][0]).to.match(/Unable either to grant permissions or flush privileges/);
                expect(endStub.calledOnce).to.be.true;
            });
        });
    });

    it('_query runs query and logs query in verbose mode', function () {
        const MysqlExtension = require(modulePath);
        const queryStub = sinon.stub().callsArg(1);
        const logStub = sinon.stub();

        const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
        instance.connection = {query: queryStub};

        return instance._query('SELECT * FROM table').then(() => {
            expect(queryStub.calledOnce).to.be.true;
            expect(queryStub.calledWith('SELECT * FROM table')).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/SELECT \* FROM table/);
        });
    });
});
