'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const {isObservable} = require('rxjs');
const {getReadableStream} = require('../../utils/stream');
const {ProcessError, SystemError} = require('../../../lib/errors');

const modulePath = '../../../lib/utils/pnpm';

const setup = proxies => proxyquire(modulePath, proxies);

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

    describe('can return observables', function () {
        it('ends properly', function () {
            const execa = sinon.stub().callsFake(() => {
                const promise = Promise.resolve();
                promise.stdout = getReadableStream();
                return promise;
            });
            const pnpm = setup({execa});

            const res = pnpm([], {observe: true});
            expect(isObservable(res)).to.be.true;

            const subscriber = {
                next: sinon.stub(),
                error: sinon.stub(),
                complete: sinon.stub()
            };

            res.subscribe(subscriber);

            return res.toPromise().then(() => {
                expect(execa.calledOnce).to.be.true;
                expect(subscriber.next.called).to.be.false;
                expect(subscriber.error.called).to.be.false;
                expect(subscriber.complete.calledOnce).to.be.true;
            });
        });

        it('ends properly (error)', function () {
            const execa = sinon.stub().callsFake(() => {
                const promise = Promise.reject(new Error('test error'));
                promise.stdout = getReadableStream();
                return promise;
            });
            const pnpm = setup({execa});

            const res = pnpm([], {observe: true});
            expect(isObservable(res)).to.be.true;

            const subscriber = {
                next: sinon.stub(),
                error: sinon.stub(),
                complete: sinon.stub()
            };

            res.subscribe(subscriber);

            return res.toPromise().catch((error) => {
                expect(error.message).to.equal('test error');
                expect(execa.calledOnce).to.be.true;
                expect(subscriber.next.called).to.be.false;
                expect(subscriber.error.calledOnce).to.be.true;
                expect(subscriber.error.args[0][0]).to.be.an.instanceOf(ProcessError);
                expect(subscriber.complete.called).to.be.false;
            });
        });

        it('passes corepack signature errors through as helpful system errors', function () {
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
            const subscriber = {
                next: sinon.stub(),
                error: sinon.stub(),
                complete: sinon.stub()
            };

            res.subscribe(subscriber);

            return res.toPromise().catch(() => {
                expect(subscriber.error.calledOnce).to.be.true;
                expect(subscriber.error.args[0][0]).to.be.an.instanceOf(SystemError);
                expect(subscriber.error.args[0][0].options.suggestion).to.contain('corepack@latest');
                expect(subscriber.error.args[0][0].options.suggestion).to.not.contain('prepare');
                expect(subscriber.complete.called).to.be.false;
            });
        });

        it('passes data through', function () {
            const execa = sinon.stub().callsFake(() => {
                const promise = Promise.resolve();
                promise.stdout = getReadableStream(function () {
                    this.push('test message\n');
                    this.push(null);
                });
                return promise;
            });
            const pnpm = setup({execa});

            const res = pnpm([], {observe: true});
            expect(isObservable(res)).to.be.true;

            const subscriber = {
                next: sinon.stub(),
                error: sinon.stub(),
                complete: sinon.stub()
            };

            res.subscribe(subscriber);

            return res.toPromise().then(() => {
                expect(execa.calledOnce).to.be.true;
                expect(subscriber.next.calledOnce).to.be.true;
                expect(subscriber.next.calledWithExactly('test message')).to.be.true;
                expect(subscriber.error.called).to.be.false;
                expect(subscriber.complete.calledOnce).to.be.true;
            });
        });
    });
});
