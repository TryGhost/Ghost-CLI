'use strict';
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const {getReadableStream, collect, isReadable, fakeSubprocess} = require('../../utils/stream');
const {ProcessError, SystemError} = require('../../../lib/errors');

const modulePath = '../../../lib/utils/pnpm';

const setup = ({execa, ...proxies}) => proxyquire(modulePath, execa ? {...proxies, execa: {execa}} : proxies);

describe('Unit: pnpm', function () {
    it('spawns pnpm process with no arguments correctly', function () {
        const execa = sinon.stub().resolves();
        const pnpm = setup({execa});

        return pnpm().then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][0]).to.equal('pnpm');
            expect(execa.args[0][1]).to.deep.equal([]);
        });
    });

    it('uses corepack pnpm when pnpm not available', function () {
        const execa = sinon.stub().resolves();
        const which = {
            sync: sinon.fake(cmd => (cmd !== 'corepack' ? null : '/usr/bin/corepack'))
        };
        const pnpm = setup({execa, which});

        return pnpm().then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0][0]).to.equal('corepack');
            expect(execa.args[0][1]).to.deep.equal(['pnpm']);
        });
    });

    it('throws SystemError when neither pnpm nor corepack are available', function () {
        const which = {
            sync: sinon.stub().returns(null)
        };
        const pnpm = setup({which});

        return pnpm().then(() => {
            expect(false, 'Promise should have rejected').to.be.true;
        }).catch((error) => {
            expect(which.sync.calledWith('pnpm', {nothrow: true})).to.be.true;
            expect(which.sync.calledWith('corepack', {nothrow: true})).to.be.true;
            expect(error).to.be.an.instanceOf(SystemError);
        });
    });

    it('spawns pnpm process with correct arguments', function () {
        const execa = sinon.stub().resolves();
        const pnpm = setup({execa});

        return pnpm(['install']).then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0][1]).to.deep.equal(['install']);
        });
    });

    it('does not append --verbose to args', function () {
        const execa = sinon.stub().resolves();
        const pnpm = setup({execa});

        return pnpm(['install'], {verbose: true}).then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0][1]).to.deep.equal(['install']);
        });
    });

    it('correctly passes through options', function () {
        const execa = sinon.stub().resolves();
        const pnpm = setup({execa});

        return pnpm([], {cwd: 'test'}).then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0][2]).to.be.an('object');
            expect(execa.args[0][2].cwd).to.equal('test');
        });
    });

    it('fails gracefully when pnpm fails', function () {
        const execa = sinon.stub().rejects(new Error('pnpm failed'));
        const pnpm = setup({execa});

        return pnpm().then(() => {
            expect(false, 'Promise should have rejected').to.be.true;
        }).catch((error) => {
            expect(execa.calledOnce).to.be.true;
            expect(error).to.be.an.instanceOf(ProcessError);
        });
    });

    it('returns a helpful system error when corepack cannot verify pnpm signatures', function () {
        const execa = sinon.stub().rejects({
            message: 'Command failed: pnpm install',
            stderr: '/usr/local/lib/node_modules/corepack/dist/lib/corepack.cjs:21535\nError: Cannot find matching keyid'
        });
        const pnpm = setup({execa});

        return pnpm(['install']).then(() => {
            expect(false, 'Promise should have rejected').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceOf(SystemError);
            expect(error.message).to.equal('Corepack could not verify pnpm because its package-signing keys are out of date.');
            expect(error.options.suggestion).to.equal('npm install -g corepack@latest && corepack enable');
        });
    });

    it('returns a helpful system error when the pinned pnpm was installed without its binary', function () {
        const execa = sinon.stub().rejects({
            message: 'Command failed with exit code 2: pnpm install --prod',
            stderr: '/home/ghost/.local/share/pnpm/.tools/pnpm/12.2.1/bin/pnpm: 4: Syntax error: ")" unexpected'
        });
        const pnpm = setup({execa});

        return pnpm(['install']).then(() => {
            expect(false, 'Promise should have rejected').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceOf(SystemError);
            expect(error.message).to.match(/without its native binary/);
            expect(error.options.help).to.contain('11.10.0');
            expect(error.options.suggestion).to.equal('npm install -g pnpm@latest');
        });
    });

    it('detects the placeholder pnpm binary across shells', function () {
        const stderrs = [
            '/root/.local/share/pnpm/.tools/pnpm/12.2.1/bin/pnpm: 4: Syntax error: ")" unexpected',
            '/usr/local/bin/pnpm: line 4: syntax error near unexpected token `)\'',
            '/usr/local/bin/pnpm:4: parse error near `)\'',
            'This is a placeholder. pnpm\'s native binary replaces this file'
        ];

        return Promise.all(stderrs.map((stderr) => {
            const execa = sinon.stub().rejects({message: 'Command failed', stderr});
            const pnpm = setup({execa});

            return pnpm(['install']).then(() => {
                expect(false, `Promise should have rejected for: ${stderr}`).to.be.true;
            }, (error) => {
                expect(error, stderr).to.be.an.instanceOf(SystemError);
                expect(error.message, stderr).to.match(/without its native binary/);
            });
        }));
    });

    it('does not mistake unrelated placeholder output for a broken pnpm binary', function () {
        const execa = sinon.stub().rejects({
            message: 'Command failed with exit code 1: pnpm install --prod',
            stderr: 'node-pre-gyp WARN This is a placeholder build, run `make` to replace it'
        });
        const pnpm = setup({execa});

        return pnpm(['install']).then(() => {
            expect(false, 'Promise should have rejected').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceOf(ProcessError);
        });
    });

    it('does not mistake an unrelated syntax error for a broken pnpm binary', function () {
        const execa = sinon.stub().rejects({
            message: 'Command failed with exit code 1: pnpm install --prod \'--store-dir=/var/www/ghost/.pnpm-store\'',
            stderr: '/var/www/ghost/versions/6.62.0/node_modules/.pnpm/sharp@0.34.0/install.js:12\nSyntaxError: Unexpected token'
        });
        const pnpm = setup({execa});

        return pnpm(['install']).then(() => {
            expect(false, 'Promise should have rejected').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceOf(ProcessError);
        });
    });

    it('returns a helpful system error when the pnpm store is read-only', function () {
        const execa = sinon.stub().rejects({
            message: 'Command failed: pnpm install',
            stderr: 'ERR_SQLITE_ERROR: attempt to write a readonly database'
        });
        const pnpm = setup({execa});

        return pnpm(['install']).then(() => {
            expect(false, 'Promise should have rejected').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceOf(SystemError);
            expect(error.message).to.equal('pnpm could not write to its package store because the store database is read-only.');
        });
    });

    describe('can return a readable stream', function () {
        it('ends properly', async function () {
            const execa = sinon.stub().callsFake(() => {
                const promise = Promise.resolve();
                promise.stdout = getReadableStream();
                return promise;
            });
            const pnpm = setup({execa});

            const res = pnpm([], {observe: true});
            expect(isReadable(res)).to.be.true;

            expect(await collect(res)).to.deep.equal([]);
            expect(execa.calledOnce).to.be.true;
        });

        it('ends properly (error)', async function () {
            const execa = sinon.stub().callsFake(() => {
                const promise = Promise.reject(new Error('test error'));
                promise.stdout = getReadableStream();
                return promise;
            });
            const pnpm = setup({execa});

            const res = pnpm([], {observe: true});
            expect(isReadable(res)).to.be.true;

            const error = await collect(res).then(() => null, err => err);
            expect(error).to.be.an.instanceOf(ProcessError);
            expect(error.message).to.equal('test error');
            expect(execa.calledOnce).to.be.true;
        });

        it('errors when pnpm itself is unavailable', async function () {
            const which = {sync: sinon.stub().returns(null)};
            const pnpm = setup({which});

            const res = pnpm([], {observe: true});

            const error = await collect(res).then(() => null, err => err);
            expect(error).to.be.an.instanceOf(SystemError);
            expect(error.message).to.match(/pnpm is not installed/);
        });

        it('passes corepack signature errors through as helpful system errors', async function () {
            const execa = sinon.stub().callsFake(() => {
                const promise = Promise.reject({
                    message: 'Command failed: pnpm install',
                    stderr: '/usr/local/lib/node_modules/corepack/dist/lib/corepack.cjs:21535\nError: Cannot find matching keyid'
                });
                promise.stdout = getReadableStream();
                return promise;
            });
            const pnpm = setup({execa});

            const res = pnpm([], {observe: true});

            const error = await collect(res).then(() => null, err => err);
            expect(error).to.be.an.instanceOf(SystemError);
            expect(error.options.suggestion).to.contain('corepack@latest');
            expect(error.options.suggestion).to.not.contain('prepare');
        });

        it('passes data through', async function () {
            const execa = sinon.stub().callsFake(() => fakeSubprocess({
                stdout: getReadableStream(function () {
                    this.push('test message\n');
                    this.push(null);
                })
            }));
            const pnpm = setup({execa});

            const res = pnpm([], {observe: true});
            expect(isReadable(res)).to.be.true;

            expect(await collect(res)).to.deep.equal(['test message\n']);
            expect(execa.calledOnce).to.be.true;
        });
    });
});
