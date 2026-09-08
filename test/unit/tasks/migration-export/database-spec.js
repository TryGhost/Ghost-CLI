const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const {ProcessError, SystemError} = require('../../../../lib/errors');

const modulePath = '../../../../lib/tasks/migration-export/database';
const {databaseKind, dumpArgs} = require(modulePath);

function fakeInstance(connection, client = 'mysql') {
    const config = {database: {client, connection}};
    return {
        config: {
            get: (key, defaultValue) => {
                const [section, sub] = key.split('.');
                const value = sub ? (config[section] || {})[sub] : config[section];
                return value === undefined ? defaultValue : value;
            }
        }
    };
}

describe('Unit: Tasks > migration-export > database', function () {
    describe('databaseKind', function () {
        it('returns mysql-dump for mysql clients', function () {
            expect(databaseKind(fakeInstance({}, 'mysql'))).to.equal('mysql-dump');
            expect(databaseKind(fakeInstance({}, 'mysql2'))).to.equal('mysql-dump');
        });

        it('returns portable for sqlite3 and anything unknown', function () {
            expect(databaseKind(fakeInstance({}, 'sqlite3'))).to.equal('portable');
            expect(databaseKind(fakeInstance({}, null))).to.equal('portable');
        });
    });

    describe('dumpArgs', function () {
        it('builds host/port args', function () {
            expect(dumpArgs({host: '127.0.0.1', port: 3307, user: 'ghost', database: 'ghost_prod'})).to.deep.equal([
                '--no-tablespaces',
                '--single-transaction',
                '--host=127.0.0.1',
                '--port=3307',
                '--user=ghost',
                'ghost_prod'
            ]);
        });

        it('defaults the host and omits an absent port/user', function () {
            expect(dumpArgs({database: 'ghost_prod'})).to.deep.equal([
                '--no-tablespaces',
                '--single-transaction',
                '--host=localhost',
                'ghost_prod'
            ]);
        });

        it('prefers a socket when one is configured', function () {
            expect(dumpArgs({socketPath: '/tmp/mysql.sock', host: 'nope', user: 'ghost', database: 'ghost_prod'})).to.deep.equal([
                '--no-tablespaces',
                '--single-transaction',
                '--socket=/tmp/mysql.sock',
                '--user=ghost',
                'ghost_prod'
            ]);
        });
    });

    describe('dumpDatabase', function () {
        it('runs mysqldump with the password in the environment', async function () {
            const execa = sinon.stub().resolves();
            const which = sinon.stub().resolves('/usr/bin/mysqldump');
            const {dumpDatabase} = proxyquire(modulePath, {execa: {execa}, which});

            await dumpDatabase(fakeInstance({host: 'db', user: 'ghost', password: 'hunter2', database: 'ghost_prod'}), '/tmp/out.sql');

            expect(which.calledOnceWithExactly('mysqldump')).to.be.true;
            expect(execa.calledOnce).to.be.true;

            const [bin, args, options] = execa.args[0];
            expect(bin).to.equal('mysqldump');
            expect(args).to.contain('ghost_prod');
            expect(options.env).to.deep.equal({MYSQL_PWD: 'hunter2'});
            expect(options.stdout).to.deep.equal({file: '/tmp/out.sql'});
        });

        it('throws if the config has no database name', async function () {
            const execa = sinon.stub().resolves();
            const {dumpDatabase} = proxyquire(modulePath, {execa: {execa}});

            try {
                await dumpDatabase(fakeInstance({host: 'db'}), '/tmp/out.sql');
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.include('No database name');
                expect(execa.called).to.be.false;
                return;
            }

            expect.fail('dumpDatabase should have errored');
        });

        it('throws if mysqldump isn\'t installed', async function () {
            const execa = sinon.stub().resolves();
            const which = sinon.stub().rejects(new Error('not found'));
            const {dumpDatabase} = proxyquire(modulePath, {execa: {execa}, which});

            try {
                await dumpDatabase(fakeInstance({database: 'ghost_prod'}), '/tmp/out.sql');
            } catch (error) {
                expect(error).to.be.an.instanceof(SystemError);
                expect(error.message).to.include('mysqldump is required');
                expect(execa.called).to.be.false;
                return;
            }

            expect.fail('dumpDatabase should have errored');
        });

        it('wraps mysqldump failures in a ProcessError', async function () {
            const execa = sinon.stub().rejects(new Error('access denied'));
            const which = sinon.stub().resolves('/usr/bin/mysqldump');
            const {dumpDatabase} = proxyquire(modulePath, {execa: {execa}, which});

            try {
                await dumpDatabase(fakeInstance({database: 'ghost_prod'}), '/tmp/out.sql');
            } catch (error) {
                expect(error).to.be.an.instanceof(ProcessError);
                return;
            }

            expect.fail('dumpDatabase should have errored');
        });
    });
});
