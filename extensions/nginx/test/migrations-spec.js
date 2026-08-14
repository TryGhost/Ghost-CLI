'use strict';
const fs = require('fs');
const path = require('path');
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

    describe('migrateActivityPubDns', function () {
        const legacyConf = [
            '    location ~ /.well-known/(webfinger|nodeinfo) {',
            '        proxy_ssl_server_name on;',
            '        proxy_pass https://ap.ghost.org;',
            '    }'
        ].join('\n');

        const migratedConf = [
            '    location ~ /.well-known/(webfinger|nodeinfo) {',
            '        proxy_ssl_server_name on;',
            '        # Resolved per-request so nginx can still start when DNS is briefly unavailable (Ghost-CLI#2044)',
            '        resolver 127.0.0.53 valid=300s;',
            '        resolver_timeout 5s;',
            '        set $activitypub_upstream https://ap.ghost.org;',
            '        proxy_pass $activitypub_upstream;',
            '    }'
        ].join('\n');

        function getExtension() {
            return {
                getResolvers: sinon.stub().returns('127.0.0.53'),
                template: sinon.stub().resolves(),
                restartNginx: sinon.stub().resolves(),
                ui: {sudo: sinon.stub().resolves()}
            };
        }

        it('skips if no config uses the literal upstream', async function () {
            const skip = sinon.stub();
            const ext = getExtension();
            const migrate = proxyquire(modulePath, {
                'fs-extra': {
                    existsSync: () => true,
                    readFileSync: () => migratedConf
                }
            });

            await migrate.migrateActivityPubDns.call(ext, context, {skip});

            expect(skip.calledOnce).to.be.true;
            expect(ext.template.called).to.be.false;
            expect(ext.restartNginx.called).to.be.false;
        });

        it('rewrites every affected config, then tests and reloads nginx', async function () {
            const skip = sinon.stub();
            const ext = getExtension();
            const existsSync = sinon.stub().returns(true);
            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync, readFileSync: () => legacyConf}
            });

            await migrate.migrateActivityPubDns.call(ext, context, {skip});

            expect(skip.called).to.be.false;
            expect(existsSync.args.map(([file]) => file)).to.deep.equal([
                '/etc/nginx/sites-available/ghost.org.conf',
                '/etc/nginx/sites-available/ghost.org-ssl.conf'
            ]);

            expect(ext.template.calledTwice).to.be.true;
            expect(ext.template.args[0][1]).to.equal(migratedConf);
            expect(ext.template.args[0][3]).to.equal('ghost.org.conf');
            expect(ext.template.args[0][4]).to.equal('/etc/nginx/sites-available');
            expect(ext.template.args[1][3]).to.equal('ghost.org-ssl.conf');

            expect(ext.ui.sudo.calledOnceWithExactly('nginx -t')).to.be.true;
            expect(ext.restartNginx.calledOnce).to.be.true;
        });

        it('only migrates the configs that exist', async function () {
            const ext = getExtension();
            const migrate = proxyquire(modulePath, {
                'fs-extra': {
                    existsSync: file => !file.includes('-ssl'),
                    readFileSync: () => legacyConf
                }
            });

            await migrate.migrateActivityPubDns.call(ext, context, {skip: sinon.stub()});

            expect(ext.template.calledOnce).to.be.true;
            expect(ext.template.args[0][3]).to.equal('ghost.org.conf');
        });

        it('restores the original config if nginx rejects the new one', async function () {
            const ext = getExtension();
            ext.ui.sudo.rejects(new Error('bad config'));
            const migrate = proxyquire(modulePath, {
                'fs-extra': {
                    existsSync: file => !file.includes('-ssl'),
                    readFileSync: () => legacyConf
                }
            });

            try {
                await migrate.migrateActivityPubDns.call(ext, context, {skip: sinon.stub()});
                expect(false, 'should have errored').to.be.true;
            } catch (error) {
                expect(error).to.be.an.instanceof(cli.errors.CliError);
                expect(error.options.err.message).to.equal('bad config');
            }

            expect(ext.template.calledTwice).to.be.true;
            expect(ext.template.args[0][1]).to.equal(migratedConf);
            expect(ext.template.args[1][1]).to.equal(legacyConf);
            expect(ext.restartNginx.called).to.be.false;
        });

        it('restores already migrated configs if a later write fails', async function () {
            const ext = getExtension();
            ext.template.onCall(1).rejects(new Error('mv failed'));
            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: () => true, readFileSync: () => legacyConf}
            });

            try {
                await migrate.migrateActivityPubDns.call(ext, context, {skip: sinon.stub()});
                expect(false, 'should have errored').to.be.true;
            } catch (error) {
                expect(error).to.be.an.instanceof(cli.errors.CliError);
                expect(error.options.err.message).to.equal('mv failed');
            }

            // both configs get rolled back, even though only the first one was written
            expect(ext.template.callCount).to.equal(4);
            expect(ext.template.args[2]).to.deep.equal([context.instance, legacyConf, 'nginx config', 'ghost.org.conf', '/etc/nginx/sites-available']);
            expect(ext.template.args[3][1]).to.equal(legacyConf);
            expect(ext.ui.sudo.called).to.be.false;
            expect(ext.restartNginx.called).to.be.false;
        });
    });

    describe('migrateXForwardedFor', function () {
        const confFile = '/etc/nginx/sites-available/ghost.org.conf';
        const sslConfFile = '/etc/nginx/sites-available/ghost.org-ssl.conf';
        const oldHeader = 'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;';
        const newHeader = 'proxy_set_header X-Forwarded-For $remote_addr;';

        it('skips if no nginx config exists for this domain', async function () {
            const existsSync = sinon.stub().returns(false);
            const skip = sinon.stub();
            const sudo = sinon.stub().resolves();
            const restartNginx = sinon.stub().resolves();

            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSync}
            });

            await migrate.migrateXForwardedFor.call({ui: {sudo}, restartNginx}, context, {skip});

            expect(existsSync.calledTwice).to.be.true;
            expect(existsSync.calledWithExactly(confFile)).to.be.true;
            expect(existsSync.calledWithExactly(sslConfFile)).to.be.true;
            expect(skip.calledOnce).to.be.true;
            expect(sudo.called).to.be.false;
            expect(restartNginx.called).to.be.false;
        });

        it('skips if the configs already use the new header', async function () {
            const existsSync = sinon.stub().returns(true);
            const readFileSync = sinon.stub().returns(`server {\n    ${newHeader}\n}\n`);
            const skip = sinon.stub();
            const sudo = sinon.stub().resolves();
            const restartNginx = sinon.stub().resolves();

            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSync, readFileSync: readFileSync}
            });

            await migrate.migrateXForwardedFor.call({ui: {sudo}, restartNginx}, context, {skip});

            expect(readFileSync.calledTwice).to.be.true;
            expect(skip.calledOnce).to.be.true;
            expect(sudo.called).to.be.false;
            expect(restartNginx.called).to.be.false;
        });

        it('updates only the configs that still use the old header', async function () {
            const existsSync = sinon.stub();
            const readFileSync = sinon.stub();
            const skip = sinon.stub();
            const sudo = sinon.stub().resolves();
            const restartNginx = sinon.stub().resolves();

            existsSync.withArgs(confFile).returns(true);
            existsSync.withArgs(sslConfFile).returns(false);
            readFileSync.withArgs(confFile).returns(`server {\n    ${oldHeader}\n}\n`);

            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSync, readFileSync: readFileSync}
            });

            await migrate.migrateXForwardedFor.call({ui: {sudo}, restartNginx}, context, {skip});

            expect(skip.called).to.be.false;
            expect(sudo.calledOnce).to.be.true;
            expect(sudo.calledWithExactly(`sed -i 's|${oldHeader}|${newHeader}|' ${confFile}`)).to.be.true;
            expect(restartNginx.calledOnce).to.be.true;
        });

        it('updates both configs and restarts nginx', async function () {
            const existsSync = sinon.stub().returns(true);
            const readFileSync = sinon.stub().returns(`server {\n    ${oldHeader}\n}\n`);
            const skip = sinon.stub();
            const sudo = sinon.stub().resolves();
            const restartNginx = sinon.stub().resolves();

            const migrate = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsSync, readFileSync: readFileSync}
            });

            await migrate.migrateXForwardedFor.call({ui: {sudo}, restartNginx}, context, {skip});

            expect(skip.called).to.be.false;
            expect(sudo.calledTwice).to.be.true;
            expect(sudo.calledWithExactly(`sed -i 's|${oldHeader}|${newHeader}|' ${confFile}`)).to.be.true;
            expect(sudo.calledWithExactly(`sed -i 's|${oldHeader}|${newHeader}|' ${sslConfFile}`)).to.be.true;
            expect(restartNginx.calledOnce).to.be.true;
        });
    });
});
