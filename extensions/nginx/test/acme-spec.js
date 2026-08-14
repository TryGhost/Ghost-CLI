'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const os = require('os');
const path = require('path');
const {Writable} = require('stream');

const modulePath = '../acme';

const cli = require('../../../lib');
const acmeTmpDir = path.join(os.tmpdir(), 'acme.sh');

/**
 * Stubs out the acme.sh tarball download - a global fetch that streams the
 * given chunks, and a tar extractor that swallows them.
 */
function stubDownload(chunks = ['acme tarball']) {
    const fetchStub = sinon.stub(global, 'fetch').resolves({
        ok: true,
        body: ReadableStream.from(chunks)
    });
    const extractStub = sinon.stub().callsFake(() => new Writable({
        write: (chunk, encoding, cb) => cb()
    }));

    return {fetchStub, extractStub};
}

/**
 * Stubs out the GitHub release lookup - ky returns a thenable exposing `.json()`,
 * which resolves the parsed body or rejects for network/parse failures.
 */
function stubApi({resolves, rejects} = {}) {
    const json = rejects ? sinon.stub().rejects(rejects) : sinon.stub().resolves(resolves);
    return sinon.stub().returns({json});
}

describe('Unit: Extensions > Nginx > Acme', function () {
    afterEach(() => {
        sinon.restore();
    });

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
        it('upgrades if isInstalled returns true', function () {
            const sudo = sinon.stub().resolves();
            const existsStub = sinon.stub().returns(true);

            const acme = proxyquire(modulePath, {
                'fs-extra': {existsSync: existsStub}
            });

            return acme.install({sudo}).then(() => {
                expect(existsStub.calledOnce).to.be.true;
                expect(sudo.calledOnceWithExactly('/etc/letsencrypt/acme.sh --upgrade --home /etc/letsencrypt')).to.be.true;
            });
        });

        it('rejects if the tarball download returns an error status', function () {
            const dwUrl = 'https://ghost.org/docs/install/';
            const kyStub = stubApi({resolves: {tarball_url: dwUrl}});
            const existsStub = sinon.stub().returns(false);
            const emptyStub = sinon.stub();
            const {extractStub} = stubDownload();
            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();

            global.fetch.resolves({ok: false, status: 503});

            const acme = proxyquire(modulePath, {
                ky: {default: kyStub},
                tar: {x: extractStub},
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub}
            });

            return acme.install({sudo: sudoStub, logVerbose: logStub}).then(() => {
                expect(false, 'Promise should have been rejected').to.be.true;
            }).catch((error) => {
                expect(error).to.be.an.instanceof(cli.errors.CliError);
                expect(error.message).to.equal('Unable to download acme.sh (503)');
                expect(extractStub.called).to.be.false;
                // only the `mkdir -p` call, acme.sh is never installed
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.args[0][0]).to.match(/mkdir -p/);
            });
        });

        it('rejects without installing if extraction fails', function () {
            const dwUrl = 'https://ghost.org/docs/install/';
            const kyStub = stubApi({resolves: {tarball_url: dwUrl}});
            const existsStub = sinon.stub().returns(false);
            const emptyStub = sinon.stub();
            const {fetchStub, extractStub} = stubDownload();
            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();

            // tar rejecting a bad entry surfaces as an error on the extract stream
            extractStub.callsFake(() => new Writable({
                write: (chunk, encoding, cb) => cb(new Error('TAR_ENTRY_INVALID'))
            }));

            const acme = proxyquire(modulePath, {
                ky: {default: kyStub},
                tar: {x: extractStub},
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub}
            });

            return acme.install({sudo: sudoStub, logVerbose: logStub}).then(() => {
                expect(false, 'Promise should have been rejected').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('TAR_ENTRY_INVALID');
                expect(fetchStub.calledOnce).to.be.true;
                expect(extractStub.calledOnce).to.be.true;
                // only the `mkdir -p` call, acme.sh is never installed
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.args[0][0]).to.match(/mkdir -p/);
            });
        });

        it('rejects without installing if the download stream aborts', function () {
            const dwUrl = 'https://ghost.org/docs/install/';
            const kyStub = stubApi({resolves: {tarball_url: dwUrl}});
            const existsStub = sinon.stub().returns(false);
            const emptyStub = sinon.stub();
            const {extractStub} = stubDownload();
            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();

            global.fetch.resolves({
                ok: true,
                body: new ReadableStream({
                    start: controller => controller.error(new Error('aborted mid-download'))
                })
            });

            const acme = proxyquire(modulePath, {
                ky: {default: kyStub},
                tar: {x: extractStub},
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub}
            });

            return acme.install({sudo: sudoStub, logVerbose: logStub}).then(() => {
                expect(false, 'Promise should have been rejected').to.be.true;
            }).catch((error) => {
                expect(error.message).to.equal('aborted mid-download');
                // only the `mkdir -p` call, acme.sh is never installed
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.args[0][0]).to.match(/mkdir -p/);
            });
        });

        it('downloads acme.sh', function () {
            const dwUrl = 'https://ghost.org/docs/install/';
            const kyStub = stubApi({resolves: {tarball_url: dwUrl}});
            const existsStub = sinon.stub().returns(false);
            const emptyStub = sinon.stub();
            const {fetchStub, extractStub} = stubDownload();
            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();

            const acme = proxyquire(modulePath, {
                ky: {default: kyStub},
                tar: {x: extractStub},
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub}
            });

            return acme.install({sudo: sudoStub, logVerbose: logStub}).then(() => {
                expect(existsStub.calledOnce).to.be.true;
                expect(logStub.calledThrice).to.be.true;
                expect(sudoStub.calledTwice).to.be.true;
                expect(emptyStub.calledOnce).to.be.true;
                expect(kyStub.calledOnce).to.be.true;
                expect(fetchStub.calledOnce).to.be.true;
                expect(fetchStub.args[0][0]).to.equal(dwUrl);
                expect(fetchStub.args[0][1].signal).to.be.an.instanceof(AbortSignal);
                expect(extractStub.calledOnce).to.be.true;
                expect(extractStub.args[0][0]).to.deep.equal({cwd: acmeTmpDir, strip: 1, strict: true});
                expect(sudoStub.args[0][0]).to.match(/mkdir -p/);
                expect(sudoStub.args[1][0]).to.match(/acme\.sh --install/);
                expect(sudoStub.args[1][1]).to.deep.equal({cwd: acmeTmpDir});
            });
        });

        it('Errors when github is down', function () {
            const err = new Error('Not Found');
            err.statusCode = '404';
            // ky resolves only when the status is 2xx, otherwise it throws an HTTPError
            // see https://github.com/sindresorhus/ky#httperror
            const kyStub = stubApi({rejects: err});
            const existsStub = sinon.stub().returns(false);
            const emptyStub = sinon.stub();
            const {fetchStub, extractStub} = stubDownload();
            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();

            const acme = proxyquire(modulePath, {
                ky: {default: kyStub},
                tar: {x: extractStub},
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub}
            });

            return acme.install({sudo: sudoStub, logVerbose: logStub}, {}).then(() => {
                expect(false, 'Promise should have been rejected').to.be.true;
            }).catch((reject) => {
                expect(reject).to.exist;
                expect(reject.message).to.match(/fetch download URL/i);
                expect(reject.err.message).to.match(/not found/i);
                expect(logStub.calledTwice).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(emptyStub.calledOnce).to.be.true;
                expect(kyStub.calledOnce).to.be.true;
                expect(fetchStub.called).to.be.false;
                expect(extractStub.called).to.be.false;
            });
        });

        it('Errors when bad data is passed', function () {
            // a 200 whose body isn't JSON - ky surfaces the parse failure from `.json()`
            const kyStub = stubApi({rejects: new SyntaxError('Unexpected token \'W\', "Waffles" is not valid JSON')});
            const existsStub = sinon.stub().returns(false);
            const emptyStub = sinon.stub();
            const {fetchStub, extractStub} = stubDownload();
            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();

            const acme = proxyquire(modulePath, {
                ky: {default: kyStub},
                tar: {x: extractStub},
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub}
            });

            return acme.install({sudo: sudoStub, logVerbose: logStub}, {}).then(() => {
                expect(false, 'Promise should have been rejected').to.be.true;
            }).catch((reject) => {
                expect(reject).to.exist;
                expect(reject.message).to.match(/fetch download URL/i);
                expect(reject.err.message).to.match(/unexpected token/i);
                expect(logStub.calledTwice).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(emptyStub.calledOnce).to.be.true;
                expect(kyStub.calledOnce).to.be.true;
                expect(fetchStub.called).to.be.false;
                expect(extractStub.called).to.be.false;
            });
        });

        it('Rejects when acme.sh fails', function () {
            const kyStub = stubApi({resolves: {tarball_url: 'test'}});
            const emptyStub = sinon.stub().resolves();
            const existsStub = sinon.stub().returns(false);
            const {fetchStub, extractStub} = stubDownload();

            const acme = proxyquire(modulePath, {
                ky: {default: kyStub},
                tar: {x: extractStub},
                'fs-extra': {existsSync: existsStub, emptyDir: emptyStub}
            });

            const logStub = sinon.stub();
            const sudoStub = sinon.stub().resolves();
            sudoStub.onSecondCall().rejects({stderr: 'CODE: ENOTFOUND', command: 'acme'});

            return acme.install({sudo: sudoStub, logVerbose: logStub}).then(() => {
                expect(false, 'Promise should have been rejected').to.be.true;
            }).catch((reject) => {
                expect(reject.message).to.equal('Error occurred running command: \'acme\'');
                expect(reject.options.stderr).to.equal('CODE: ENOTFOUND');
                expect(logStub.calledThrice).to.be.true;
                expect(sudoStub.calledTwice).to.be.true;
                expect(emptyStub.calledOnce).to.be.true;
                expect(kyStub.calledOnce).to.be.true;
                expect(fetchStub.calledOnce).to.be.true;
                expect(extractStub.calledOnce).to.be.true;
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
            acmeError.exitCode = 2;
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
