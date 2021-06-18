'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const {isObservable} = require('rxjs');
const {getReadableStream} = require('../../utils/stream');
const {ProcessError} = require('../../../lib/errors');

const modulePath = '../../../lib/utils/yarn';

const setup = proxies => proxyquire(modulePath, proxies);

describe('Unit: yarn', function () {
    let currentEnv;

    beforeEach(function () {
        currentEnv = process.env;
        process.env = {};
    });

    afterEach(function () {
        process.env = currentEnv;
    });

    it('spawns yarn process with no arguments correctly', function () {
        const execa = sinon.stub().resolves();
        const yarn = setup({execa});

        return yarn().then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal([]);
        });
    });

    it('spawns yarn process with correct arguments', function () {
        const execa = sinon.stub().resolves();
        const yarn = setup({execa});

        return yarn(['cache', 'clear']).then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal(['cache', 'clear']);
        });
    });

    it('adds verbose option correctly', function () {
        const execa = sinon.stub().resolves();
        const yarn = setup({execa});

        return yarn(['cache', 'clear'], {verbose: true}).then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal(['cache', 'clear', '--verbose']);
        });
    });

    it('correctly passes through options', function () {
        const execa = sinon.stub().resolves();
        const yarn = setup({execa});

        return yarn([], {cwd: 'test'}).then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][2]).to.be.an('object');
            expect(execa.args[0][2].cwd).to.equal('test');
        });
    });

    it('respects process.env overrides but doesn\'t mutate process.env', function () {
        const execa = sinon.stub().resolves();
        const yarn = setup({execa});

        process.env.TESTENV = 'test';
        return yarn([], {env: {TESTENV: 'override'}}).then(() => {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0][2]).to.be.an('object');
            expect(execa.args[0][2].env).to.be.an('object');
            expect(execa.args[0][2].env.TESTENV).to.equal('override');
            expect(process.env.TESTENV).to.equal('test');
        });
    });

    it('fails gracefully when yarn fails', function () {
        const execa = sinon.stub().rejects(new Error('YARN_TO_FAST'));
        const yarn = setup({execa});

        return yarn().then(() => {
            expect(false, 'Promise should have rejected').to.be.true;
        }).catch((error) => {
            expect(execa.calledOnce).to.be.true;
            expect(error).to.be.ok;
            expect(error).to.be.instanceOf(ProcessError);
        });
    });

    describe('can return observables', function () {
        it('ends properly', function () {
            const execa = sinon.stub().callsFake(() => {
                const promise = Promise.resolve();
                promise.stdout = getReadableStream();
                return promise;
            });
            const yarn = setup({execa});

            const res = yarn([], {observe: true});
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
            const yarn = setup({execa});

            const res = yarn([], {observe: true});
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

        it('passes data through', function () {
            const execa = sinon.stub().callsFake(() => {
                const promise = Promise.resolve();
                promise.stdout = getReadableStream(function () {
                    this.push('test message\n');
                    this.push(null);
                });
                return promise;
            });
            const yarn = setup({execa});

            const res = yarn([], {observe: true});
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

        it('passes data through with verbose', function () {
            const execa = sinon.stub().callsFake(() => {
                const promise = Promise.resolve();
                promise.stdout = getReadableStream(function () {
                    this.push('test message\n');
                    this.push(null);
                });
                promise.stderr = getReadableStream(function () {
                    this.push('test stderr message\n');
                    this.push(null);
                });
                return promise;
            });
            const yarn = setup({execa});

            const res = yarn([], {observe: true, verbose: true});
            expect(isObservable(res)).to.be.true;

            const subscriber = {
                next: sinon.stub(),
                error: sinon.stub(),
                complete: sinon.stub()
            };

            res.subscribe(subscriber);

            return res.toPromise().then(() => {
                expect(execa.calledOnce).to.be.true;
                expect(subscriber.next.calledTwice).to.be.true;
                expect(subscriber.next.calledWithExactly('test message')).to.be.true;
                expect(subscriber.next.calledWithExactly('test stderr message')).to.be.true;
                expect(subscriber.error.called).to.be.false;
                expect(subscriber.complete.calledOnce).to.be.true;
            });
        });
    });
});
