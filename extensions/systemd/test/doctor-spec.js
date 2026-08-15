const sinon = require('sinon');

const fs = require('node:fs/promises');
const proxyquire = require('proxyquire');
const {errors} = require('../../../lib');

const modulePath = '../doctor';

const setup = execa => proxyquire(modulePath, {execa: {execa}});

const {checkUnitFile, checkNodeVersion} = setup(sinon.stub());

describe('Unit: Systemd > doctor checks', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('checkUnitFile', function () {
        it('errors when readFile errors', async function () {
            const readFile = sinon.stub(fs, 'readFile').rejects(new Error('test'));
            const ctx = {
                instance: {name: 'test'}
            };

            const expectedPath = '/lib/systemd/system/ghost_test.service';

            await expect(checkUnitFile(ctx)).rejects.toThrow(errors.SystemError);
            expect(readFile.calledOnceWithExactly(expectedPath)).to.be.true;
            expect(ctx.systemd).to.deep.equal({unitFilePath: expectedPath});
        });

        it('adds valid unit file to context', async function () {
            const readFile = sinon.stub(fs, 'readFile').resolves(`
[Section1]
Foo=Bar
Baz = Bat

[Section2]
Test=Value
            `);

            const ctx = {
                instance: {name: 'test'}
            };

            const expectedPath = '/lib/systemd/system/ghost_test.service';
            const expectedCtx = {
                unitFilePath: expectedPath,
                unit: {
                    Section1: {
                        Foo: 'Bar',
                        Baz: 'Bat'
                    },
                    Section2: {
                        Test: 'Value'
                    }
                }
            };

            await checkUnitFile(ctx);
            expect(readFile.calledOnceWithExactly(expectedPath)).to.be.true;
            expect(ctx.systemd).to.deep.equal(expectedCtx);
        });
    });

    describe('checkNodeVersion', function () {
        it('rejects if ExecStart line not found', async function () {
            const ctx = {
                systemd: {
                    unitFilePath: '/tmp/unit-file',
                    unit: {}
                }
            };
            const task = {};

            await expect(checkNodeVersion(ctx, task)).rejects.toThrow(errors.SystemError);
        });

        it('rejects if node --version rejects', async function () {
            const execaStub = sinon.stub().rejects(new Error('test error'));
            const {checkNodeVersion} = setup(execaStub);

            const ctx = {
                systemd: {
                    unitFilePath: '/tmp/unit-file',
                    unit: {
                        Service: {
                            ExecStart: '/usr/bin/node /usr/bin/ghost'
                        }
                    }
                }
            };
            const task = {};

            await expect(checkNodeVersion(ctx, task)).rejects.toThrow(errors.SystemError);
            expect(execaStub.calledOnceWithExactly('/usr/bin/node', ['--version'])).to.be.true;
        });

        it('rejects if invalid semver', async function () {
            const execaStub = sinon.stub().resolves({stdout: 'not-valid-semver'});
            const {checkNodeVersion} = setup(execaStub);

            const ctx = {
                systemd: {
                    unitFilePath: '/tmp/unit-file',
                    unit: {
                        Service: {
                            ExecStart: '/usr/bin/node /usr/bin/ghost'
                        }
                    }
                }
            };
            const task = {};

            await expect(checkNodeVersion(ctx, task)).rejects.toThrow(errors.SystemError);
            expect(execaStub.calledOnceWithExactly('/usr/bin/node', ['--version'])).to.be.true;
        });

        it('returns if unable to parse ghost pkg json', async function () {
            const execaStub = sinon.stub().resolves({stdout: '12.0.0'});
            const {checkNodeVersion} = setup(execaStub);
            const readJson = sinon.stub(fs, 'readFile').rejects(new Error('test'));
            const log = sinon.stub();

            const ctx = {
                systemd: {
                    unitFilePath: '/tmp/unit-file',
                    unit: {
                        Service: {
                            ExecStart: '/usr/bin/node /usr/bin/ghost'
                        }
                    }
                },
                ui: {log},
                instance: {dir: '/var/www/ghost'}
            };
            const task = {};

            await checkNodeVersion(ctx, task);
            expect(execaStub.calledOnceWithExactly('/usr/bin/node', ['--version'])).to.be.true;
            expect(task.title).to.equal('Checking systemd node version - found v12.0.0');
            expect(readJson.calledOnceWithExactly('/var/www/ghost/current/package.json', 'utf8')).to.be.true;
            expect(log.calledOnce).to.be.true;
        });

        it('returns if unable to find node range in ghost pkg json', async function () {
            const execaStub = sinon.stub().resolves({stdout: process.versions.node});
            const {checkNodeVersion} = setup(execaStub);
            const readJson = sinon.stub(fs, 'readFile').resolves('{}');
            const log = sinon.stub();

            const ctx = {
                systemd: {
                    unitFilePath: '/tmp/unit-file',
                    unit: {
                        Service: {
                            ExecStart: '/usr/bin/node /usr/bin/ghost'
                        }
                    }
                },
                ui: {log},
                instance: {dir: '/var/www/ghost'}
            };
            const task = {};

            await checkNodeVersion(ctx, task);
            expect(execaStub.calledOnceWithExactly('/usr/bin/node', ['--version'])).to.be.true;
            expect(task.title).to.equal(`Checking systemd node version - found v${process.versions.node}`);
            expect(readJson.calledOnceWithExactly('/var/www/ghost/current/package.json', 'utf8')).to.be.true;
            expect(log.called).to.be.false;
        });

        it('rejects if node version isn\'t compatible with Ghost' , async function () {
            const execaStub = sinon.stub().resolves({stdout: process.versions.node});
            const {checkNodeVersion} = setup(execaStub);
            const readJson = sinon.stub(fs, 'readFile').resolves(JSON.stringify({
                engines: {node: '< 1.0.0'}
            }));
            const log = sinon.stub();

            const ctx = {
                systemd: {
                    unitFilePath: '/tmp/unit-file',
                    unit: {
                        Service: {
                            ExecStart: '/usr/bin/node /usr/bin/ghost'
                        }
                    }
                },
                ui: {log},
                instance: {dir: '/var/www/ghost'}
            };
            const task = {};

            await expect(checkNodeVersion(ctx, task)).rejects.toThrow(errors.SystemError);
            expect(execaStub.calledOnceWithExactly('/usr/bin/node', ['--version'])).to.be.true;
            expect(task.title).to.equal(`Checking systemd node version - found v${process.versions.node}`);
            expect(readJson.calledOnceWithExactly('/var/www/ghost/current/package.json', 'utf8')).to.be.true;
            expect(log.called).to.be.false;
        });
    });
});
