'use strict';
const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../migrations';

const cli = require('../../../lib');

const context = {
    instance: {
        dir: '/var/www/ghost',
        config: {
            get: () => 'https://ghost.org'
        }
    }
};

const sslWithoutLe = fs.readFileSync(path.join(__dirname, './fixtures/ssl-without-le.txt'), {encoding: 'utf8'});
const oldSslWithLe = fs.readFileSync(path.join(__dirname, './fixtures/old-ssl-with-le.txt'), {encoding: 'utf8'});

describe('Unit: Extensions > Nginx > Migrations', function () {
    describe('migrateSSL', function () {
        it('skips if ssl is not set up', function () {
            const existsStub = sinon.stub().returns(false);
            const skipStub = sinon.stub();

            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsStub}
            });

            migrate.migrateSSL(context, {skip: skipStub});

            expect(existsStub.calledOnce).to.be.true;
            expect(existsStub.calledWithExactly('/var/www/ghost/system/files/ghost.org-ssl.conf')).to.be.true;
            expect(skipStub.calledOnce).to.be.true;
        });

        it('skips if cert has not been generated using the old method', function () {
            const skip = sinon.stub();
            const existsSync = sinon.stub();

            existsSync.withArgs('/var/www/ghost/system/files/ghost.org-ssl.conf').returns(true);
            existsSync.withArgs('/home/ghost/.acme.sh/ghost.org').returns(false);

            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSync},
                os: {homedir: () => '/home/ghost'}
            });

            migrate.migrateSSL(context, {skip: skip});

            expect(existsSync.calledTwice).to.be.true;
            expect(existsSync.calledWithExactly('/var/www/ghost/system/files/ghost.org-ssl.conf')).to.be.true;
            expect(existsSync.calledWithExactly('/home/ghost/.acme.sh/ghost.org')).to.be.true;
            expect(skip.calledOnce).to.be.true;
        });

        it('skips if ssl conf isn\'t using an LE cert', function () {
            const skip = sinon.stub();
            const existsSync = sinon.stub();
            const readFileSync = sinon.stub();

            const confFile = '/var/www/ghost/system/files/ghost.org-ssl.conf';

            existsSync.withArgs(confFile).returns(true);
            existsSync.withArgs('/home/ghost/.acme.sh/ghost.org').returns(true);
            readFileSync.withArgs(confFile).returns(sslWithoutLe);

            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSync, readFileSync: readFileSync},
                os: {homedir: () => '/home/ghost'}
            });

            migrate.migrateSSL(context, {skip: skip});

            expect(existsSync.calledTwice).to.be.true;
            expect(existsSync.calledWithExactly('/var/www/ghost/system/files/ghost.org-ssl.conf')).to.be.true;
            expect(existsSync.calledWithExactly('/home/ghost/.acme.sh/ghost.org')).to.be.true;
            expect(readFileSync.calledOnce).to.be.true;
            expect(readFileSync.calledWithExactly(confFile, {encoding: 'utf8'})).to.be.true;
            expect(skip.calledOnce).to.be.true;
        });

        it('throws an error if it can\'t parse the letsencrypt account email', function () {
            const existsSync = sinon.stub().returns(true);
            const readFileSync = sinon.stub();

            readFileSync.onFirstCall().returns(oldSslWithLe);
            readFileSync.onSecondCall().returns('');

            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSync, readFileSync: readFileSync},
                os: {homedir: () => '/home/ghost'}
            });

            try {
                migrate.migrateSSL(context);
                expect(false, 'error should have been thrown').to.be.true;
            } catch (e) {
                expect(e).to.be.an.instanceof(cli.errors.SystemError);
                expect(e.message).to.equal('Unable to parse letsencrypt account email');

                expect(readFileSync.calledTwice).to.be.true;
                expect(readFileSync.calledWithExactly('/home/ghost/.acme.sh/account.conf', {encoding: 'utf8'})).to.be.true;
            }
        });

        it('runs tasks correctly', function () {
            const existsSync = sinon.stub().returns(true);
            const readFileSync = sinon.stub();

            readFileSync.onFirstCall().returns(oldSslWithLe);
            readFileSync.onSecondCall().returns('ACCOUNT_EMAIL=\'test@example.com\'\n');

            const restartStub = sinon.stub().resolves();
            const replaceStub = sinon.stub().resolves();

            const acme = {
                install: sinon.stub().resolves(),
                generate: sinon.stub().resolves(),
                remove: sinon.stub().resolves()
            };
            const ui = {
                listr: sinon.stub()
            };

            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSync, readFileSync: readFileSync},
                'replace-in-file': replaceStub,
                './acme': acme,
                os: {homedir: () => '/home/ghost'}
            });

            const fn = migrate.migrateSSL.bind({ui: ui, restartNginx: restartStub});

            fn(context);

            expect(existsSync.calledTwice).to.be.true;
            expect(readFileSync.calledTwice).to.be.true;
            expect(ui.listr.calledOnce).to.be.true;

            const tasks = ui.listr.args[0][0];
            expect(tasks).to.have.length(5);

            return tasks[0].task(null).then(() => {
                expect(acme.install.calledOnce).to.be.true;

                return tasks[1].task();
            }).then(() => {
                expect(acme.generate.calledOnce).to.be.true;
                expect(acme.generate.calledWithExactly(
                    ui,
                    'ghost.org',
                    '/var/www/ghost/system/nginx-root',
                    'test@example.com',
                    false
                )).to.be.true;

                return tasks[2].task();
            }).then(() => {
                expect(replaceStub.calledOnce).to.be.true;

                return tasks[3].task();
            }).then(() => {
                expect(restartStub.calledOnce).to.be.true;

                return tasks[4].task();
            }).then(() => {
                expect(acme.remove.calledOnce).to.be.true;
                expect(acme.remove.calledWithExactly('ghost.org', ui, '/home/ghost/.acme.sh')).to.be.true;
            });
        });
    });
});
