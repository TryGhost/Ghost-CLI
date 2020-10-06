'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const stripAnsi = require('strip-ansi');
const proxyquire = require('proxyquire');

const path = require('path');
const errors = require('../../../../../lib/errors');

const modulePath = '../../../../../lib/commands/doctor/checks/node-version';

describe('Unit: Doctor Checks > nodeVersion', function () {
    let originalArgv;
    let originalEnv;

    beforeEach(() => {
        originalArgv = process.argv;
        originalEnv = process.env;

        process.argv = [];
        process.env = {};
    });

    afterEach(() => {
        process.argv = originalArgv;
        process.env = originalEnv;
    });

    it('rejects if node version is not in range', function () {
        const cliPackage = {
            engines: {
                node: '0.10.0'
            }
        };

        const nodeVersion = proxyquire(modulePath, {
            '../../../../package': cliPackage
        }).task;

        return nodeVersion().then(() => {
            expect(false, 'error should be thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            const message = stripAnsi(error.message);

            expect(message).to.match(/Supported: 0.10.0/);
            expect(message).to.match(new RegExp(`Installed: ${process.versions.node}`));
        });
    });

    it('doesn\'t reject if bin is the local ghost bin file from the install (and local is true)', function () {
        const cliPackage = {
            engines: {
                node: process.versions.node // this future-proofs the test
            }
        };
        process.argv = ['node', path.join(__dirname, '../../../../bin/ghost')];
        const checkDirectoryStub = sinon.stub().resolves();

        const nodeVersion = proxyquire(modulePath, {
            '../../../../package': cliPackage,
            './check-directory': checkDirectoryStub
        }).task;

        return nodeVersion({local: true}).then(() => {
            expect(checkDirectoryStub.called).to.be.false;
        });
    });

    it('doesn\'t do anything if GHOST_NODE_VERSION_CHECK is false and local is true', function () {
        const cliPackage = {
            engines: {
                node: '0.10.0'
            }
        };
        process.env = {GHOST_NODE_VERSION_CHECK: 'false'};
        const checkDirectoryStub = sinon.stub().resolves();

        const nodeVersion = proxyquire(modulePath, {
            '../../../../package': cliPackage,
            './check-directory': checkDirectoryStub
        }).task;

        return nodeVersion({local: true}).then(() => {
            expect(checkDirectoryStub.called).to.be.false;
        });
    });

    it('doesn\'t do anything if GHOST_NODE_VERSION_CHECK is false and local is true', function () {
        const cliPackage = {
            engines: {
                node: '0.10.0'
            }
        };
        process.env = {GHOST_NODE_VERSION_CHECK: 'false'};
        const checkDirectoryStub = sinon.stub().resolves();

        const nodeVersion = proxyquire(modulePath, {
            '../../../../package': cliPackage,
            './check-directory': checkDirectoryStub
        }).task;

        return nodeVersion({local: true}).then(() => {
            expect(checkDirectoryStub.called).to.be.false;
        });
    });

    it('doesn\'t do anything if node version is in range and local is true', function () {
        const cliPackage = {
            engines: {
                node: process.versions.node // this future-proofs the test
            }
        };

        const checkDirectoryStub = sinon.stub().resolves();
        const nodeVersion = proxyquire(modulePath, {
            '../../../../package': cliPackage,
            './check-directory': checkDirectoryStub
        }).task;

        return nodeVersion({local: true}).then(() => {
            expect(checkDirectoryStub.called).to.be.false;
        });
    });

    it('doesn\'t call checkDirectoryAndAbove if os is not linux', function () {
        const cliPackage = {
            engines: {
                node: process.versions.node // this future-proofs the test
            }
        };
        const ctx = {local: false, system: {platform: {linux: false}}};

        const checkDirectoryStub = sinon.stub().resolves();
        const nodeVersion = proxyquire(modulePath, {
            '../../../../package': cliPackage,
            './check-directory': checkDirectoryStub
        }).task;

        return nodeVersion(ctx).then(() => {
            expect(checkDirectoryStub.called).to.be.false;
        });
    });

    it('doesn\'t call checkDirectoryAndAbove if no-setup-linux-user is passed', function () {
        const cliPackage = {
            engines: {
                node: process.versions.node // this future-proofs the test
            }
        };
        const ctx = {local: false, argv: {'setup-linux-user': false}, system: {platform: {linux: true}}};

        const checkDirectoryStub = sinon.stub().resolves();
        const nodeVersion = proxyquire(modulePath, {
            '../../../../package': cliPackage,
            './check-directory': checkDirectoryStub
        }).task;

        return nodeVersion(ctx).then(() => {
            expect(checkDirectoryStub.called).to.be.false;
        });
    });

    it('calls checkDirectoryAndAbove if none of the three conditions are true', function () {
        const cliPackage = {
            engines: {
                node: process.versions.node // this future-proofs the test
            }
        };
        const ctx = {local: false, argv: {'setup-linux-user': true}, system: {platform: {linux: true}}};

        const checkDirectoryStub = sinon.stub().resolves();
        const nodeVersion = proxyquire(modulePath, {
            '../../../../package': cliPackage,
            './check-directory': checkDirectoryStub
        }).task;

        return nodeVersion(ctx).then(() => {
            expect(checkDirectoryStub.calledOnce).to.be.true;
            expect(checkDirectoryStub.calledWith(process.argv[0])).to.be.true;
        });
    });
});
