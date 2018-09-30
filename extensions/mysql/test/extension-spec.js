'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const configStub = require('../../../test/utils/config-stub');

const modulePath = '../index';
const errors = require('../../../lib/errors');

describe('Unit: Mysql extension', function () {
    it('setup hook works', function () {
        const MysqlExtension = require(modulePath);
        const inst = new MysqlExtension({}, {}, {}, '/some/dir');
        const result = inst.setup();

        expect(result).to.have.length(1);
        const [task] = result;

        // Check static properties
        expect(task.id).to.equal('mysql');
        expect(task.name).to.equal('"ghost" mysql user');

        // Check task functions
        expect(task.task).to.be.a('function');
        expect(task.enabled).to.be.a('function');
        expect(task.skip).to.be.a('function');

        // Check task.task
        const stub = sinon.stub(inst, 'setupMySQL');
        task.task('a', 'set', 'of', 'args', true);
        expect(stub.calledOnce).to.be.true;
        expect(stub.calledWithExactly('a', 'set', 'of', 'args', true)).to.be.true;

        // Check task.enabled
        expect(task.enabled({argv: {local: true}})).to.be.false;
        expect(task.enabled({argv: {local: false, db: 'sqlite3'}})).to.be.false;
        expect(task.enabled({argv: {local: false}})).to.be.true;

        // Check task.skip
        const get = sinon.stub();
        get.onFirstCall().returns('not-root');
        get.onSecondCall().returns('root');

        expect(task.skip({instance: {config: {get}}})).to.be.true;
        expect(get.calledOnce).to.be.true;
        expect(task.skip({instance: {config: {get}}})).to.be.false;
        expect(get.calledTwice).to.be.true;
    });

    it('setupMySQL works', function () {
        const MysqlExtension = require(modulePath);
        const listr = sinon.stub();
        const config = configStub();
        const dbConfig = {host: 'localhost', user: 'root', password: 'password'};
        config.get.returns(dbConfig);

        const inst = new MysqlExtension({listr}, {}, {}, '/some/dir');
        const context = {instance: {config}};
        inst.setupMySQL(context);

        expect(config.get.calledOnce).to.be.true;
        expect(config.get.calledWithExactly('database.connection')).to.be.true;
        expect(listr.calledOnce).to.be.true;
        const [tasks, ctx] = listr.args[0];
        expect(tasks).to.have.length(4);
        expect(ctx).to.be.false;

        const canConnect = sinon.stub(inst, 'canConnect');
        expect(tasks[0].title).to.equal('Connecting to database');
        tasks[0].task();
        expect(canConnect.calledOnce).to.be.true;
        expect(canConnect.calledWithExactly(context, dbConfig)).to.be.true;

        const createUser = sinon.stub(inst, 'createUser');
        expect(tasks[1].title).to.equal('Creating new MySQL user');
        tasks[1].task();
        expect(createUser.calledOnce).to.be.true;
        expect(createUser.calledWithExactly(context, dbConfig)).to.be.true;

        const grantPermissions = sinon.stub(inst, 'grantPermissions');
        expect(tasks[2].title).to.equal('Granting new user permissions');
        tasks[2].task();
        expect(grantPermissions.calledOnce).to.be.true;
        expect(grantPermissions.calledWithExactly(context, dbConfig)).to.be.true;

        const end = sinon.stub();
        inst.connection = {end};
        context.mysql = {username: 'new', password: 'new'};
        expect(tasks[3].title).to.equal('Saving new config');
        tasks[3].task();
        expect(config.set.calledTwice).to.be.true;
        expect(config.set.calledWithExactly('database.connection.user', 'new')).to.be.true;
        expect(config.set.calledWithExactly('database.connection.password', 'new')).to.be.true;
        expect(config.save.calledOnce).to.be.true;
        expect(end.calledOnce).to.be.true;
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
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.equal('Error trying to connect to the MySQL database.');
                expect(error.options.help).to.equal('You can run `ghost config` to re-enter the correct credentials. Alternatively you can run `ghost setup` again.');
                expect(error.options.err.message).to.equal('ack');
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
            queryStub.onSecondCall().resolves([{password: '*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19'}]);
            const ctx = {};

            return instance.createUser(ctx, {host: 'localhost'}).then(() => {
                expect(queryStub.calledThrice).to.be.true;
                expect(queryStub.args[0][0]).to.equal('SET old_passwords = 0;');
                expect(queryStub.args[1][0]).to.match(/^SELECT PASSWORD\('[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*'\) AS password;$/);
                expect(queryStub.args[2][0]).to.match(/^CREATE USER 'ghost-[0-9]{1,4}'@'localhost' IDENTIFIED WITH mysql_native_password AS '\*[0-9A-F]*';$/);
                expect(logStub.calledThrice).to.be.true;
                expect(logStub.args[0][0]).to.match(/disabled old_password/);
                expect(logStub.args[1][0]).to.match(/created password hash/);
                expect(logStub.args[2][0]).to.match(/successfully created new user/);
                expect(ctx.mysql).to.exist;
                expect(ctx.mysql.username).to.match(/^ghost-[0-9]{1,4}$/);
                expect(ctx.mysql.password).to.match(/^[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*$/);
            });
        });

        it('uses % for user host if db host is not localhost or 127.0.0.1', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            const queryStub = sinon.stub(instance, '_query').resolves();
            queryStub.onSecondCall().resolves([{password: '*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19'}]);
            const ctx = {};

            return instance.createUser(ctx, {host: '117.241.162.107'}).then(() => {
                expect(queryStub.calledThrice).to.be.true;
                expect(queryStub.args[0][0]).to.equal('SET old_passwords = 0;');
                expect(queryStub.args[1][0]).to.match(/^SELECT PASSWORD\('[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*'\) AS password;$/);
                expect(queryStub.args[2][0]).to.match(/^CREATE USER 'ghost-[0-9]{1,4}'@'%' IDENTIFIED WITH mysql_native_password AS '\*[0-9A-F]*';$/);
                expect(logStub.calledThrice).to.be.true;
                expect(logStub.args[0][0]).to.match(/disabled old_password/);
                expect(logStub.args[1][0]).to.match(/created password hash/);
                expect(logStub.args[2][0]).to.match(/successfully created new user/);
                expect(ctx.mysql).to.exist;
                expect(ctx.mysql.username).to.match(/^ghost-[0-9]{1,4}$/);
                expect(ctx.mysql.password).to.match(/^[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*$/);
            });
        });

        it('retries creating user if username already exists', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            const queryStub = sinon.stub(instance, '_query').resolves();
            queryStub.onSecondCall().resolves([{password: '*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19'}]);
            const err = new Error();
            err.errno = 1396;
            queryStub.onThirdCall().rejects(new errors.CliError({message: 'User exists already', err: err}));
            const ctx = {};

            return instance.createUser(ctx, {host: 'localhost'}).then(() => {
                expect(queryStub.callCount).to.equal(4);
                expect(queryStub.args[0][0]).to.equal('SET old_passwords = 0;');
                expect(queryStub.args[1][0]).to.match(/^SELECT PASSWORD\('[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*'\) AS password;$/);
                expect(queryStub.args[2][0]).to.match(/^CREATE USER 'ghost-[0-9]{1,4}'@'localhost' IDENTIFIED WITH mysql_native_password AS '\*[0-9A-F]*';$/);
                expect(queryStub.args[3][0]).to.match(/^CREATE USER 'ghost-[0-9]{1,4}'@'localhost' IDENTIFIED WITH mysql_native_password AS '\*[0-9A-F]*';$/);
                expect(logStub.callCount).to.equal(4);
                expect(logStub.args[0][0]).to.match(/disabled old_password/);
                expect(logStub.args[1][0]).to.match(/created password hash/);
                expect(logStub.args[2][0]).to.match(/user exists, re-trying user creation/);
                expect(logStub.args[3][0]).to.match(/successfully created new user/);
                expect(ctx.mysql).to.exist;
                expect(ctx.mysql.username).to.match(/^ghost-[0-9]{1,4}$/);
                expect(ctx.mysql.password).to.match(/^[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*$/);
            });
        });

        it('rejects if error occurs during user creation', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            const queryStub = sinon.stub(instance, '_query').resolves();
            queryStub.onSecondCall().resolves([{password: '*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19'}]);
            const err = new Error('User exists already');
            err.errno = 9999;
            queryStub.onThirdCall().rejects(new errors.CliError({message: 'User exists already', err: err, context: 'SELECT PASSWORD'}));
            const endStub = sinon.stub();
            instance.connection = {end: endStub};

            return instance.createUser({}, {host: 'localhost'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.match(/Creating new MySQL user errored with message:/);
                expect(error.options.err).to.exist;
                expect(error.options.context).to.match(/^SELECT PASSWORD/);
                expect(error.options.err.message).to.equal('User exists already');
                expect(queryStub.callCount).to.equal(3);
                expect(queryStub.args[0][0]).to.equal('SET old_passwords = 0;');
                expect(queryStub.args[1][0]).to.match(/^SELECT PASSWORD\('[a-zA-Z0-9!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]*'\) AS password;$/);
                expect(queryStub.args[2][0]).to.match(/^CREATE USER 'ghost-[0-9]{1,4}'@'localhost' IDENTIFIED WITH mysql_native_password AS '\*[0-9A-F]*';$/);
                expect(logStub.callCount).to.equal(3);
                expect(logStub.args[0][0]).to.match(/disabled old_password/);
                expect(logStub.args[1][0]).to.match(/created password hash/);
                expect(logStub.args[2][0]).to.match(/Unable to create custom Ghost user/);
                expect(endStub.calledOnce).to.be.true;
            });
        });

        it('catches cli errors and ends connection if any query fails', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            const queryStub = sinon.stub(instance, '_query').resolves();
            const endStub = sinon.stub();
            instance.connection = {end: endStub};
            queryStub.onSecondCall().resolves([{password: '*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19'}]);
            queryStub.onThirdCall().rejects(new errors.CliError({message: 'something failed', err: new Error('something failed'), context: 'SET old_passwords = 0;'}));

            return instance.createUser({}, {host: 'localhost'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.match(/Creating new MySQL user errored with message: something failed/);
                expect(error.options.context).to.match(/SET old_passwords = 0/);
                expect(error.options.err.message).to.equal('something failed');
                expect(queryStub.calledThrice).to.be.true;
                expect(queryStub.args[2][0]).to.match(/CREATE USER/);
                expect(logStub.calledThrice).to.be.true;
                expect(logStub.args[2][0]).to.match(/MySQL: Unable to create custom Ghost user/);
                expect(endStub.calledOnce).to.be.true;
            });
        });

        it('rejects with CliError and ends connection if any query fails', function () {
            const logStub = sinon.stub();
            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            const queryStub = sinon.stub(instance, '_query').rejects(new errors.CliError({message: 'Oopsi', err: new Error('something failed'), context: 'SET old_passwords = 0;'}));
            const endStub = sinon.stub();
            instance.connection = {end: endStub};

            return instance.createUser({}, {host: 'localhost'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.match(/Creating new MySQL user errored with message: Oopsi/);
                expect(error.options.err).to.exist;
                expect(queryStub.calledOnce).to.be.true;
                expect(queryStub.args[0][0]).to.equal('SET old_passwords = 0;');
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

            return instance.grantPermissions({mysql: {username: 'testuser', host: '%'}}, {host: 'localhost', database: 'ghost'}).then(() => {
                expect(queryStub.calledTwice).to.be.true;
                expect(queryStub.calledWithExactly('GRANT ALL PRIVILEGES ON ghost.* TO \'testuser\'@\'%\';')).to.be.true;
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
            queryStub.onSecondCall().rejects(new errors.CliError({message: 'something failed', err: new Error('something failed'), context: 'FLUSH PRIVILEGES;'}));

            return instance.grantPermissions({mysql: {username: 'test'}}, {host: 'localhost', database: 'ghost'}).then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.match(/Granting database permissions errored with message: something failed/);
                expect(error.options.err).to.exist;
                expect(error.options.context).to.equal('FLUSH PRIVILEGES;');
                expect(queryStub.calledTwice).to.be.true;
                expect(logStub.calledTwice).to.be.true;
                expect(logStub.args[0][0]).to.match(/Successfully granted privileges/);
                expect(logStub.args[1][0]).to.match(/Unable either to grant permissions or flush privileges/);
                expect(endStub.calledOnce).to.be.true;
            });
        });
    });

    describe('_query', function () {
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

        it('rejects with correct CliError', function () {
            const MysqlExtension = require(modulePath);
            const queryStub = sinon.stub().throws(new Error('failed executing'));
            const logStub = sinon.stub();

            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            instance.connection = {query: queryStub};

            return instance._query('SELECT * FROM table').then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.equal('failed executing');
                expect(error.options.context).to.equal('SELECT * FROM table');
                expect(error.options.err).to.exist;
                expect(error.options.err.message).to.equal('failed executing');
                expect(queryStub.calledOnce).to.be.true;
                expect(queryStub.calledWith('SELECT * FROM table')).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/SELECT \* FROM table/);
            });
        });

        it('passes through if error is already a CliError', function () {
            const MysqlExtension = require(modulePath);
            const err = new errors.CliError('failed executing');
            err.options.context = 'SELECT * FROM table';
            err.options.err = new Error('failed executing');
            const queryStub = sinon.stub().throws(err);
            const logStub = sinon.stub();

            const instance = new MysqlExtension({logVerbose: logStub}, {}, {}, '/some/dir');
            instance.connection = {query: queryStub};

            return instance._query('SELECT * FROM table').then(() => {
                expect(false, 'error should have been thrown').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(errors.CliError);
                expect(error.message).to.equal('failed executing');
                expect(error.options.context).to.equal('SELECT * FROM table');
                expect(error.options.err).to.exist;
                expect(error.options.err.message).to.equal('failed executing');
                expect(queryStub.calledOnce).to.be.true;
                expect(queryStub.calledWith('SELECT * FROM table')).to.be.true;
                expect(logStub.calledOnce).to.be.true;
                expect(logStub.args[0][0]).to.match(/SELECT \* FROM table/);
            });
        });
    });
});
