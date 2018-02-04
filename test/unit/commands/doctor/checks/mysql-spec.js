'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const execa = require('execa');
const errors = require('../../../../../lib/errors');

const mysqlCheck = require('../../../../../lib/commands/doctor/checks/mysql');

describe('Unit: Doctor Checks > mysql', function () {
    const sandbox = sinon.sandbox.create();

    afterEach(() => {
        sandbox.restore();
    });

    it('enables works', function () {
        expect(mysqlCheck).to.exist;
        expect(mysqlCheck.enabled({argv: {}}), 'doesn\'t skip by default').to.be.true;
        expect(mysqlCheck.enabled({local: true, argv: {}}), 'skips if local').to.be.false;
        expect(mysqlCheck.enabled({argv: {db: 'sqlite3'}}), 'skips if db is sqlite3').to.be.false;
        expect(mysqlCheck.enabled({argv: {dbhost: 'localhost'}}), 'no skip if dbhost is localhost').to.be.true;
        expect(mysqlCheck.enabled({argv: {dbhost: '127.0.0.1'}}), 'no skip if dbhost is 127.0.0.1').to.be.true;
        expect(mysqlCheck.enabled({argv: {dbhost: 'mysql.exernalhost.com'}}), 'skip if dbhost is remote').to.be.false;
    });

    it('appends sbin to path if platform is linux', function () {
        const execaStub = sandbox.stub(execa, 'shell').resolves();
        const ctx = {system: {platform: {linux: true}}};

        return mysqlCheck.task(ctx).then(() => {
            expect(execaStub.calledOnce).to.be.true;
            expect(execaStub.args[0][1].env).to.exist;
            expect(execaStub.args[0][1].env.PATH).to.match(/^\/usr\/sbin:/);
        });
    });

    it('does not append sbin to path if platform is not linux', function () {
        const execaStub = sandbox.stub(execa, 'shell').resolves();
        const ctx = {system: {platform: {linux: false}}};

        return mysqlCheck.task(ctx).then(() => {
            expect(execaStub.calledOnce).to.be.true;
            expect(execaStub.args[0][1]).to.be.empty;
        });
    });

    it('calls confirm if execa rejects and allowPrompt is true', function () {
        const execaStub = sandbox.stub(execa, 'shell').rejects();
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: true});
        const skipStub = sandbox.stub();

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        return mysqlCheck.task(ctx, {skip: skipStub}).then(() => {
            expect(execaStub.calledOnce).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/MySQL install not found/);
            expect(confirmStub.calledOnce).to.be.true;
            expect(skipStub.calledOnce).to.be.true;
        });
    });

    it('rejects if confirm says no', function () {
        const execaStub = sandbox.stub(execa, 'shell').rejects();
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: false});

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: true},
            system: {platform: {linux: true}}
        };

        return mysqlCheck.task(ctx).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('MySQL check failed.');

            expect(execaStub.calledOnce).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/MySQL install not found/);
            expect(confirmStub.calledOnce).to.be.true;
        });
    });

    it('rejects if allowPrompt is false', function () {
        const execaStub = sandbox.stub(execa, 'shell').rejects();
        const logStub = sandbox.stub();
        const confirmStub = sandbox.stub().resolves({yes: true});

        const ctx = {
            ui: {log: logStub, confirm: confirmStub, allowPrompt: false},
            system: {platform: {linux: true}}
        };

        return mysqlCheck.task(ctx).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('MySQL check failed.');

            expect(execaStub.calledOnce).to.be.true;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/MySQL install not found/);
            expect(confirmStub.calledOnce).to.be.false;
        });
    });
});
