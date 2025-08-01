const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const errors = require('../../../../../lib/errors');

describe('Unit: Doctor Checks > pythonSetuptools', function () {
    let originalNodeVersion;

    beforeEach(function () {
        originalNodeVersion = process.versions.node;
    });

    afterEach(function () {
        Object.defineProperty(process.versions, 'node', {
            value: originalNodeVersion,
            writable: true
        });
    });

    describe('enabled', function () {
        let pythonSetuptools;

        beforeEach(function () {
            // Mock Node 22+ for all tests in this suite
            Object.defineProperty(process.versions, 'node', {
                value: '22.0.0',
                writable: true
            });

            pythonSetuptools = require('../../../../../lib/commands/doctor/checks/python-setuptools');
        });

        it('returns false for Node version < 22', function () {
            Object.defineProperty(process.versions, 'node', {
                value: '20.0.0',
                writable: true
            });

            const ctx = {};
            const result = pythonSetuptools.enabled(ctx);
            expect(result).to.be.false;
        });

        it('returns true for local installs on Node 22+', function () {
            const ctx = {local: true, instance: {}};
            const result = pythonSetuptools.enabled(ctx);
            expect(result).to.be.true;
        });

        it('returns true when instance uses sqlite3', function () {
            const ctx = {
                instance: {
                    isSetup: true,
                    config: {
                        values: {
                            database: {
                                client: 'sqlite3'
                            }
                        }
                    }
                }
            };
            const result = pythonSetuptools.enabled(ctx);
            expect(result).to.be.true;
        });

        it('returns false when instance uses mysql', function () {
            const ctx = {
                instance: {
                    isSetup: true,
                    config: {
                        values: {
                            database: {
                                client: 'mysql'
                            }
                        }
                    }
                }
            };
            const result = pythonSetuptools.enabled(ctx);
            expect(result).to.be.false;
        });

        it('returns true when --db sqlite3 is specified', function () {
            const ctx = {argv: {db: 'sqlite3'}, instance: {}};
            const result = pythonSetuptools.enabled(ctx);
            expect(result).to.be.true;
        });

        it('returns false when --db mysql is specified', function () {
            const ctx = {argv: {db: 'mysql'}, instance: {}};
            const result = pythonSetuptools.enabled(ctx);
            expect(result).to.be.false;
        });

        it('returns false when no db specified and no local flag', function () {
            const ctx = {argv: {}, instance: {}};
            const result = pythonSetuptools.enabled(ctx);
            expect(result).to.be.false;
        });
    });

    describe('task', function () {
        let ctx, task, pythonSetuptools;

        beforeEach(function () {
            ctx = {};
            task = {
                title: 'initial title'
            };
        });

        describe('when Python3 is not available', function () {
            beforeEach(function () {
                const execaStub = sinon.stub().rejects(new Error('Command not found'));
                pythonSetuptools = proxyquire('../../../../../lib/commands/doctor/checks/python-setuptools', {
                    execa: execaStub
                });
            });

            it('throws SystemError', async function () {
                try {
                    await pythonSetuptools.task(ctx, task);
                    expect.fail('Should have thrown an error');
                } catch (error) {
                    expect(error).to.be.instanceof(errors.SystemError);
                    expect(error.message).to.equal('Python is required for SQLite3');
                }
            });
        });

        describe('when Python3 is available', function () {
            it('updates task title with Python version for Python 3.12+', async function () {
                const execaStub = sinon.stub();
                execaStub.withArgs('python3', ['--version']).resolves({stdout: 'Python 3.12.0'});
                execaStub.withArgs('python3', ['-c', 'import setuptools']).resolves();
                
                pythonSetuptools = proxyquire('../../../../../lib/commands/doctor/checks/python-setuptools', {
                    execa: execaStub
                });

                await pythonSetuptools.task(ctx, task);

                expect(task.title).to.include('found Python v3.12.0 with setuptools');
            });

            it('updates task title for Python < 3.12 (no setuptools check)', async function () {
                const execaStub = sinon.stub();
                execaStub.withArgs('python3', ['--version']).resolves({stdout: 'Python 3.11.0'});
                
                pythonSetuptools = proxyquire('../../../../../lib/commands/doctor/checks/python-setuptools', {
                    execa: execaStub
                });

                await pythonSetuptools.task(ctx, task);

                expect(task.title).to.include('found Python v3.11.0');
            });

            describe('when setuptools is not available (Python 3.12+)', function () {
                beforeEach(function () {
                    const execaStub = sinon.stub();
                    execaStub.withArgs('python3', ['--version']).resolves({stdout: 'Python 3.12.0'});
                    execaStub.withArgs('python3', ['-c', 'import setuptools']).rejects(new Error('Module not found'));
                    
                    pythonSetuptools = proxyquire('../../../../../lib/commands/doctor/checks/python-setuptools', {
                        execa: execaStub
                    });
                });

                it('throws SystemError', async function () {
                    try {
                        await pythonSetuptools.task(ctx, task);
                        expect.fail('Should have thrown an error');
                    } catch (error) {
                        expect(error).to.be.instanceof(errors.SystemError);
                        expect(error.message).to.equal('Python setuptools is required for SQLite3 when using Python 3.12+');
                    }
                });
            });

            describe('when setuptools is available (Python 3.12+)', function () {
                beforeEach(function () {
                    const execaStub = sinon.stub();
                    execaStub.withArgs('python3', ['--version']).resolves({stdout: 'Python 3.12.0'});
                    execaStub.withArgs('python3', ['-c', 'import setuptools']).resolves();
                    
                    pythonSetuptools = proxyquire('../../../../../lib/commands/doctor/checks/python-setuptools', {
                        execa: execaStub
                    });
                });

                it('completes successfully', async function () {
                    await pythonSetuptools.task(ctx, task);

                    expect(task.title).to.include('found Python v3.12.0 with setuptools');
                });
            });
        });

        describe('timeout handling', function () {
            it('handles timeout for python3 --version', async function () {
                const execaStub = sinon.stub().rejects(new Error('Timeout'));
                pythonSetuptools = proxyquire('../../../../../lib/commands/doctor/checks/python-setuptools', {
                    execa: execaStub
                });

                try {
                    await pythonSetuptools.task(ctx, task);
                    expect.fail('Should have thrown an error');
                } catch (error) {
                    expect(error).to.be.instanceof(errors.SystemError);
                    expect(execaStub.calledWith('python3', ['--version'], {timeout: 5000})).to.be.true;
                }
            });

            it('handles timeout for setuptools import', async function () {
                const execaStub = sinon.stub();
                execaStub.withArgs('python3', ['--version']).resolves({stdout: 'Python 3.12.0'});
                execaStub.withArgs('python3', ['-c', 'import setuptools'], {timeout: 5000}).rejects(new Error('Timeout'));
                
                pythonSetuptools = proxyquire('../../../../../lib/commands/doctor/checks/python-setuptools', {
                    execa: execaStub
                });

                try {
                    await pythonSetuptools.task(ctx, task);
                    expect.fail('Should have thrown an error');
                } catch (error) {
                    expect(error).to.be.instanceof(errors.SystemError);
                    expect(execaStub.calledWith('python3', ['-c', 'import setuptools'], {timeout: 5000})).to.be.true;
                }
            });
        });
    });

    describe('module exports', function () {
        it('has correct properties', function () {
            const pythonSetuptools = require('../../../../../lib/commands/doctor/checks/python-setuptools');
            expect(pythonSetuptools.title).to.equal('Checking SQLite build dependencies');
            expect(pythonSetuptools.task).to.be.a('function');
            expect(pythonSetuptools.enabled).to.be.a('function');
            expect(pythonSetuptools.category).to.deep.equal(['install']);
        });
    });
});