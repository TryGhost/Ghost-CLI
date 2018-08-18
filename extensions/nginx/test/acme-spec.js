'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../acme';

const cli = require('../../../lib');

describe('Unit: Extensions > Nginx > Acme', function () {
    it('isInstalled checks if /etc/letsencrypt/acme.sh exists', function () {
        const existsStub = sinon.stub().returns(true);
        const acme = proxyquire(modulePath, {
            'fs-extra': {existsSync: existsStub}
        });

        const result = acme.isInstalled();
        expect(result).to.be.true;
        expect(existsStub.calledOnce).to.be.true;
        expect(existsStub.calledWithExactly('/etc/letsencrypt/acme.sh')).to.be.true;
    });

    describe('install', function () {
        it('skips if isInstalled returns true', function () {
            const skipStub = sinon.stub().resolves();
            const existsStub = sinon.stub().returns(true);

            const acme = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsStub}
            });

            return acme.install({}, {skip: skipStub}).then(() => {
                expect(existsStub.calledOnce).to.be.true;
                expect(skipStub.calledOnce).to.be.true;
            });
        });

        it('downloads acme.sh', function () {
            const dwUrl = 'https://ghost.org/download';
            const fakeResponse = {
                body: JSON.stringify({tarball_url: dwUrl}),
                statusCode: 200
            };

            const gotStub = sinon.stub().resolves(fakeResponse);
            const existsStub = sinon.stub().returns(false);
            const emptyStub = sinon.stub();
            const rdsStub = sinon.stub().returns(['cake']);
            const downloadStub = sinon.stub().resolves();
            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();

            const acme = proxyquire(modulePath, {
                got: gotStub,
                download: downloadStub,
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub, readdirSync: rdsStub}
            });

            return acme.install({sudo: sudoStub, logVerbose: logStub}).then(() => {
                expect(existsStub.calledOnce).to.be.true;
                expect(logStub.calledThrice).to.be.true;
                expect(sudoStub.calledTwice).to.be.true;
                expect(emptyStub.calledOnce).to.be.true;
                expect(gotStub.calledOnce).to.be.true;
                expect(downloadStub.calledOnce).to.be.true;
                expect(downloadStub.args[0][0]).to.equal(dwUrl);
                expect(sudoStub.args[0][0]).to.match(/mkdir -p/);
                expect(sudoStub.args[1][0]).to.match(/acme\.sh --install/);
            });
        });

        it('Errors when github is down', function () {
            const err = new Error('Not Found');
            err.statusCode = '404';
            // got resolves only, when statusCode = 2xx
            // see https://github.com/sindresorhus/got#gothttperror
            const gotStub = sinon.stub().rejects(err);
            const existsStub = sinon.stub().returns(false);
            const emptyStub = sinon.stub();
            const rdsStub = sinon.stub().returns(['cake']);
            const downloadStub = sinon.stub().resolves();
            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();

            const acme = proxyquire(modulePath, {
                got: gotStub,
                download: downloadStub,
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub, readdirSync: rdsStub}
            });

            return acme.install({sudo: sudoStub, logVerbose: logStub}, {}).then(() => {
                expect(false, 'Promise should have been rejected').to.be.true;
            }).catch((reject) => {
                expect(reject).to.exist;
                expect(reject.message).to.match(/query github/i);
                expect(reject.err.message).to.match(/not found/i);
                expect(logStub.calledTwice).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(emptyStub.calledOnce).to.be.true;
                expect(gotStub.calledOnce).to.be.true;
                expect(downloadStub.called).to.be.false;
            });
        });

        it('Errors when bad data is passed', function () {
            const fakeResponse = {
                body: 'Waffles',
                statusCode: 200
            };

            const gotStub = sinon.stub().resolves(fakeResponse);
            const existsStub = sinon.stub().returns(false);
            const emptyStub = sinon.stub();
            const rdsStub = sinon.stub().returns(['cake']);
            const downloadStub = sinon.stub().resolves();
            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();

            const acme = proxyquire(modulePath, {
                got: gotStub,
                download: downloadStub,
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub, readdirSync: rdsStub}
            });

            return acme.install({sudo: sudoStub, logVerbose: logStub}, {}).then(() => {
                expect(false, 'Promise should have been rejected').to.be.true;
            }).catch((reject) => {
                expect(reject).to.exist;
                expect(reject.message).to.match(/parse github/i);
                expect(reject.err.message).to.match(/unexpected token/i);
                expect(logStub.calledTwice).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(emptyStub.calledOnce).to.be.true;
                expect(gotStub.calledOnce).to.be.true;
                expect(downloadStub.called).to.be.false;
            });
        });

        it('Rejects when acme.sh fails', function () {
            const gotStub = sinon.stub().rejects({stderr: 'CODE: ENOTFOUND', cmd: 'acme'});
            const emptyStub = sinon.stub();
            const existsStub = sinon.stub().returns(false);
            const downloadStub = sinon.stub().resolves();

            const acme = proxyquire(modulePath, {
                got: gotStub,
                download: downloadStub,
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub}
            });

            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();

            return acme.install({sudo: sudoStub, logVerbose: logStub}).then(() => {
                expect(false, 'Promise should have been rejected').to.be.true;
            }).catch((reject) => {
                expect(reject.message).to.equal('Error occurred running command: \'acme\'');
                expect(reject.options.stderr).to.equal('CODE: ENOTFOUND');
                expect(logStub.calledTwice).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(emptyStub.calledOnce).to.be.true;
                expect(gotStub.calledOnce).to.be.true;
                expect(downloadStub.called).to.be.false;
            });
        });
    });

    describe('generate', function () {
        const acme = require(modulePath);

        it('Gets an SSL certificate (prod & staging)', function () {
            const expectedSudo = new RegExp('/etc/letsencrypt/acme.sh --issue');
            const sudoStub = sinon.stub().resolves();

            return acme.generate({sudo: sudoStub}, 'domain', 'root', 'test@example.com').then(() => {
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.args[0][0]).to.match(expectedSudo);

                return acme.generate({sudo: sudoStub}, 'domain', 'root', 'test@example.com', true);
            }).then(() => {
                expect(sudoStub.calledTwice).to.be.true;
                expect(sudoStub.args[1][0]).to.match(/--issue .{0,} --staging/);
            });
        });

        it('Knows when a certificate already exists', function () {
            const acmeError = new Error('Cert exists');
            acmeError.code = 2;
            const sudoStub = sinon.stub().rejects(acmeError);

            return acme.generate({sudo: sudoStub}).then((result) => {
                expect(sudoStub.calledOnce).to.be.true;
                expect(result).to.not.exist;
            });
        });

        it('Knows when domain doesn\'t point to the right place', function () {
            const acmeError = {stderr: 'Verify error:Invalid Response'};
            const sudoStub = sinon.stub().rejects(acmeError);

            return acme.generate({sudo: sudoStub}).then(() => {
                expect(false, 'Promise should be rejected').to.be.true;
            }).catch((err) => {
                expect(sudoStub.calledOnce).to.be.true;
                expect(err).to.match(/correct IP address/i);
            });
        });

        it('Gracefully rejects unknown errors', function () {
            const acmeError = new Error('Minions overworked');
            acmeError.stderr = 'Minions overworked';
            const sudoStub = sinon.stub().rejects(acmeError);

            return acme.generate({sudo: sudoStub}).then(() => {
                expect(false, 'Promise should be rejected').to.be.true;
            }).catch((err) => {
                expect(sudoStub.calledOnce).to.be.true;
                expect(err.message).to.equal('Minions overworked');
            });
        });
    });

    describe('remove', function () {
        it('defaults to /etc/letsencrypt', function () {
            const homedirStub = sinon.stub().returns('/home/ghost');
            const sudoStub = sinon.stub().resolves();

            const acme = proxyquire(modulePath, {
                os: {homedir: homedirStub}
            });

            return acme.remove('ghost.org', {sudo: sudoStub}).then(() => {
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.args[0][0]).to.equal(
                    '/etc/letsencrypt/acme.sh --remove --home /etc/letsencrypt --domain ghost.org'
                );
            });
        });

        it('runs the right command', function () {
            const homedirStub = sinon.stub().returns('/home/ghost');
            const sudoStub = sinon.stub().resolves();

            const acme = proxyquire(modulePath, {
                os: {homedir: homedirStub}
            });

            return acme.remove('ghost.org', {sudo: sudoStub}, '/home/ghost/.acme.sh').then(() => {
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.args[0][0]).to.equal(
                    '/home/ghost/.acme.sh/acme.sh --remove --home /home/ghost/.acme.sh --domain ghost.org'
                );
            });
        });

        it('handles errors', function () {
            const homedirStub = sinon.stub().returns('/home/ghost');
            const sudoStub = sinon.stub().rejects(new Error('oops i did it again'));

            const acme = proxyquire(modulePath, {
                os: {homedir: homedirStub}
            });

            return acme.remove('ghost.org', {sudo: sudoStub}).then(() => {
                expect(false, 'Promise should be rejected').to.be.true;
            }).catch((err) => {
                expect(sudoStub.calledOnce).to.be.true;
                expect(err).to.be.an.instanceof(cli.errors.ProcessError);
                expect(err.message).to.equal('oops i did it again');
            });
        });
    });
});
