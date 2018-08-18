'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const ProcessError = require('../../../lib/errors').ProcessError;

const modulePath = '../../../lib/utils/yarn';

let yarn;

describe('Unit: yarn', function () {
    let currentEnv;
    let execa;

    beforeEach(function () {
        currentEnv = process.env;
        process.env = {};

        execa = sinon.stub().resolves();
        yarn = proxyquire(modulePath, {
            execa: execa
        });
    });

    afterEach(function () {
        process.env = currentEnv;
    });

    it('spawns yarn process with no arguments correctly', function () {
        const promise = yarn();

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal([]);
        });
    });

    it('spawns yarn process with correct arguments', function () {
        const promise = yarn(['cache', 'clear']);

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][1]).to.deep.equal(['cache', 'clear']);
        });
    });

    it('correctly passes through options', function () {
        const promise = yarn([], {cwd: 'test'});

        return promise.then(function () {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0]).to.be.ok;
            expect(execa.args[0]).to.have.lengthOf(3);
            expect(execa.args[0][2]).to.be.an('object');
            expect(execa.args[0][2].cwd).to.equal('test');
        });
    });

    it('respects process.env overrides but doesn\'t mutate process.env', function () {
        process.env.TESTENV = 'test';

        const promise = yarn([], {env: {TESTENV: 'override'}});

        return promise.then(() => {
            expect(execa.calledOnce).to.be.true;
            expect(execa.args[0][2]).to.be.an('object');
            expect(execa.args[0][2].env).to.be.an('object');
            expect(execa.args[0][2].env.TESTENV).to.equal('override');
            expect(process.env.TESTENV).to.equal('test');
        });
    });

    it('fails gracefully when yarn fails', function () {
        execa.rejects(new Error('YARN_TO_FAST'));
        yarn = proxyquire(modulePath, {execa: execa});

        return yarn().then(() => {
            expect(false, 'Promise should have rejected').to.be.true;
        }).catch((error) => {
            expect(execa.calledOnce).to.be.true;
            expect(error).to.be.ok;
            expect(error).to.be.instanceOf(ProcessError);
        });
    });

    describe('can return observables', function () {
        let stubs;
        beforeEach(function () {
            stubs = {
                stdout: sinon.stub(),
                observer: {
                    next: sinon.stub(),
                    complete: sinon.stub(),
                    error: sinon.stub()
                }
            };

            class TestClass {
                constructor(fn) {
                    stubs.proxy = {fn: fn};
                    return (new Promise((resolve,reject) => {
                        stubs.proxy.resolve = resolve;
                        stubs.proxy.reject = reject;
                    }));
                }
            }

            const execaPromise = new Promise((resolve, reject) => {
                stubs._execa = {
                    resolve: resolve,
                    reject: reject
                };
            });
            execaPromise.stdout = {
                setEncoding: () => true,
                on: stubs.stdout
            };
            execa.returns(execaPromise);

            yarn = proxyquire(modulePath, {
                execa: execa,
                rxjs: {Observable: TestClass}
            });
        });

        it('ends properly', function () {
            const res = yarn([], {observe: true});
            expect(stubs.proxy).to.be.an('Object');

            stubs.proxy.fn(stubs.observer);
            stubs._execa.resolve();
            res.then(() => {
                expect(stubs.observer.complete.calledOnce).to.be.true;
            });

            stubs.proxy.resolve();
            return res;
        });

        it('ends properly (error)', function () {
            const res = yarn([], {observe: true});
            expect(stubs.proxy).to.be.an('Object');
            stubs.proxy.fn(stubs.observer);
            stubs._execa.reject('test');

            res.then(() => {
                expect(stubs.observer.complete.called).to.be.false;
                expect(stubs.observer.error.calledOnce).to.be.true;
                expect(stubs.observer.error.args[0][0]).to.equal('test');
            });

            stubs.proxy.resolve();
            return res;
        });

        it('proxies data through', function () {
            yarn([], {observe: true});
            expect(stubs.proxy).to.be.an('Object');
            stubs.proxy.fn(stubs.observer);
            expect(stubs.stdout.calledOnce).to.be.true;
            expect(stubs.stdout.args[0][0]).to.equal('data');

            const onFn = stubs.stdout.args[0][1];
            onFn('\n\n\n');
            onFn('test\n');
            onFn('\nbest\n');
            onFn('run');

            const next = stubs.observer.next;
            expect(next.callCount).to.equal(4);
            expect(next.args[0][0]).to.equal('\n\n');
            expect(next.args[1][0]).to.equal('test');
            expect(next.args[2][0]).to.equal('\nbest');
            expect(next.args[3][0]).to.equal('run');
        });

        it('cleans up observer error', function () {
            const res = yarn([], {observe: true});
            expect(stubs.proxy).to.be.an('Object');
            stubs.proxy.reject();
            return res.then(() => {
                expect(false, 'Promise should have rejected').to.be.true;
            }).catch((e) => {
                expect(e).to.be.ok;
                expect(e).to.be.instanceOf(ProcessError);
            });
        });
    });
});
