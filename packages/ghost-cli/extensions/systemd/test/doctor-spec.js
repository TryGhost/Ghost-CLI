const {expect, use} = require('chai');
const sinon = require('sinon');

const fs = require('fs-extra');
const execa = require('execa');
const {errors} = require('../../../lib');

const {checkUnitFile, checkNodeVersion} = require('../doctor');

use(require('chai-as-promised'));

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

            await expect(checkUnitFile(ctx)).to.be.rejectedWith(errors.SystemError);
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

            await expect(checkUnitFile(ctx)).to.not.be.rejected;
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

            await expect(checkNodeVersion(ctx, task)).to.be.rejectedWith(errors.SystemError);
        });

        it('rejects if node --version rejects', async function () {
            const stdout = sinon.stub(execa, 'stdout').rejects(new Error('test error'));

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

            await expect(checkNodeVersion(ctx, task)).to.be.rejectedWith(errors.SystemError);
            expect(stdout.calledOnceWithExactly('/usr/bin/node', ['--version'])).to.be.true;
        });

        it('rejects if invalid semver', async function () {
            const stdout = sinon.stub(execa, 'stdout').resolves('not-valid-semver');

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

            await expect(checkNodeVersion(ctx, task)).to.be.rejectedWith(errors.SystemError);
            expect(stdout.calledOnceWithExactly('/usr/bin/node', ['--version'])).to.be.true;
        });

        it('returns if unable to parse ghost pkg json', async function () {
            const stdout = sinon.stub(execa, 'stdout').resolves('12.0.0');
            const readJson = sinon.stub(fs, 'readJson').rejects(new Error('test'));
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

            await expect(checkNodeVersion(ctx, task)).to.not.be.rejected;
            expect(stdout.calledOnceWithExactly('/usr/bin/node', ['--version'])).to.be.true;
            expect(task.title).to.equal('Checking systemd node version - found v12.0.0');
            expect(readJson.calledOnceWithExactly('/var/www/ghost/current/package.json')).to.be.true;
            expect(log.calledOnce).to.be.true;
        });

        it('returns if unable to find node range in ghost pkg json', async function () {
            const stdout = sinon.stub(execa, 'stdout').resolves(process.versions.node);
            const readJson = sinon.stub(fs, 'readJson').resolves({});
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

            await expect(checkNodeVersion(ctx, task)).to.not.be.rejected;
            expect(stdout.calledOnceWithExactly('/usr/bin/node', ['--version'])).to.be.true;
            expect(task.title).to.equal(`Checking systemd node version - found v${process.versions.node}`);
            expect(readJson.calledOnceWithExactly('/var/www/ghost/current/package.json')).to.be.true;
            expect(log.called).to.be.false;
        });

        it('rejects if node version isn\'t compatible with Ghost' , async function () {
            const stdout = sinon.stub(execa, 'stdout').resolves(process.versions.node);
            const readJson = sinon.stub(fs, 'readJson').resolves({
                engines: {node: '< 1.0.0'}
            });
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

            await expect(checkNodeVersion(ctx, task)).to.be.rejectedWith(errors.SystemError);
            expect(stdout.calledOnceWithExactly('/usr/bin/node', ['--version'])).to.be.true;
            expect(task.title).to.equal(`Checking systemd node version - found v${process.versions.node}`);
            expect(readJson.calledOnceWithExactly('/var/www/ghost/current/package.json')).to.be.true;
            expect(log.called).to.be.false;
        });
    });
});
