'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../migrations';

const cli = require('../../../lib');

const context =  {
    instance: {
        dir: '/var/www/ghost',
        config: {
            get: () => 'https://ghost.org'
        }
    }
};

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

        it('throws an error if it can\'t parse the letsencrypt account email', function () {
            const existsStub = sinon.stub().returns(true);
            const rfsStub = sinon.stub().returns('');

            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsStub, readFileSync: rfsStub},
                os: {homedir: () => '/home/ghost'}
            });

            try {
                migrate.migrateSSL(context);
                expect(false, 'error should have been thrown').to.be.true;
            } catch (e) {
                expect(e).to.be.an.instanceof(cli.errors.SystemError);
                expect(e.message).to.equal('Unable to parse letsencrypt account email');

                expect(rfsStub.calledWithExactly('/home/ghost/.acme.sh/account.conf'));
            }
        });

        it('runs tasks correctly', function () {
            const existsStub = sinon.stub().returns(true);
            const rfsStub = sinon.stub().returns('ACCOUNT_EMAIL=\'test@example.com\'\n');
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
                'fs-extra': {existsSync: existsStub, readFileSync: rfsStub},
                'replace-in-file': replaceStub,
                './acme': acme,
                os: {homedir: () => '/home/ghost'}
            });

            const fn = migrate.migrateSSL.bind({ui: ui, restartNginx: restartStub});

            fn(context);

            expect(existsStub.calledOnce).to.be.true;
            expect(rfsStub.calledOnce).to.be.true;
            expect(ui.listr.calledOnce).to.be.true;

            const tasks = ui.listr.getCall(0).args[0];
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
                expect(acme.remove.calledWithExactly('ghost.org', ui, '/home/ghost/.acme.sh'));
            });
        });
    });
});
