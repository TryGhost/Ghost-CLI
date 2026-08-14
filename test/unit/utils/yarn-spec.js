'use strict';
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const {getReadableStream, collect, isReadable, fakeSubprocess} = require('../../utils/stream');
const {ProcessError} = require('../../../lib/errors');

const modulePath = '../../../lib/utils/yarn';

const setup = ({execa, ...proxies}) => proxyquire(modulePath, execa ? {...proxies, execa: {execa}} : proxies);

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

    describe('can return a readable stream', function () {
        it('ends properly', async function () {
            const execa = sinon.stub().callsFake(() => {
                const promise = Promise.resolve();
                promise.stdout = getReadableStream();
                return promise;
            });
            const yarn = setup({execa});

            const res = yarn([], {observe: true});
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
            const yarn = setup({execa});

            const res = yarn([], {observe: true});
            expect(isReadable(res)).to.be.true;

            const error = await collect(res).then(() => null, err => err);
            expect(error).to.be.an.instanceOf(ProcessError);
            expect(error.message).to.equal('test error');
            expect(execa.calledOnce).to.be.true;
        });

        it('passes data through', async function () {
            const execa = sinon.stub().callsFake(() => fakeSubprocess({
                stdout: getReadableStream(function () {
                    this.push('test message\n');
                    this.push(null);
                })
            }));
            const yarn = setup({execa});

            const res = yarn([], {observe: true});
            expect(isReadable(res)).to.be.true;

            expect(await collect(res)).to.deep.equal(['test message\n']);
            expect(execa.calledOnce).to.be.true;
        });

        it('passes data through with verbose', async function () {
            const execa = sinon.stub().callsFake(() => fakeSubprocess({
                stdout: getReadableStream(function () {
                    this.push('test message\n');
                    this.push(null);
                }),
                stderr: getReadableStream(function () {
                    this.push('test stderr message\n');
                    this.push(null);
                })
            }));
            const yarn = setup({execa});

            const res = yarn([], {observe: true, verbose: true});
            expect(isReadable(res)).to.be.true;

            expect(await collect(res)).to.have.members(['test message\n', 'test stderr message\n']);
            expect(execa.calledOnce).to.be.true;
        });
    });
});
