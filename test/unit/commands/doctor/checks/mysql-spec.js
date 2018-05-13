'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const configStub = require('../../../../utils/config-stub');

const execa = require('execa');
const errors = require('../../../../../lib/errors');

const mysqlCheck = require('../../../../../lib/commands/doctor/checks/mysql');

describe('Unit: Doctor Checks > mysql', function () {
    afterEach(() => {
        sinon.restore();
    });

    describe('enabled', function () {
        it('returns false if configured db is sqlite3', function () {
            const config = configStub();
            config.get.withArgs('database.client').returns('sqlite3');

            expect(mysqlCheck.enabled({instance: {config: config}})).to.be.false;
            expect(config.get.calledOnce).to.be.true;
        });

        it('returns false if configured db host is not localhost', function () {
            expect(mysqlCheck.enabled).to.exist;

            const config = configStub();
            config.get.withArgs('database.client').returns('mysql');
            config.get.withArgs('database.connection.host').returns('mysql.externalhost.com');

            expect(mysqlCheck.enabled({instance: {config: config}})).to.be.false;
            expect(config.get.calledTwice).to.be.true;
        });

        it('returns true if configured db host is localhost', function () {
            expect(mysqlCheck.enabled).to.exist;

            const config = configStub();
            config.get.withArgs('database.client').returns('mysql');
            config.get.withArgs('database.connection.host').returns('localhost');

            expect(mysqlCheck.enabled({instance: {config: config}})).to.be.true;
            expect(config.get.calledTwice).to.be.true;
        });

        it('works correctly with various arguments', function () {
            expect(mysqlCheck.enabled({local: true, argv: {}}), 'false if local').to.be.false;
            expect(mysqlCheck.enabled({argv: {db: 'sqlite3'}}), 'skips if db is sqlite3').to.be.false;
            expect(mysqlCheck.enabled({argv: {dbhost: 'localhost'}}), 'no skip if dbhost is localhost').to.be.true;
            expect(mysqlCheck.enabled({argv: {dbhost: '127.0.0.1'}}), 'no skip if dbhost is 127.0.0.1').to.be.true;
            expect(mysqlCheck.enabled({argv: {dbhost: 'mysql.exernalhost.com'}}), 'skip if dbhost is remote').to.be.false;
        });
    });

    it('appends sbin to path if platform is linux', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves();
        const ctx = {system: {platform: {linux: true}}};

        return mysqlCheck.task(ctx).then(() => {
            expect(execaStub.calledOnce).to.be.true;
            expect(execaStub.args[0][1].env).to.exist;
            expect(execaStub.args[0][1].env.PATH).to.match(/^\/usr\/sbin:/);
        });
    });

    it('does not append sbin to path if platform is not linux', function () {
        const execaStub = sinon.stub(execa, 'shell').resolves();
        const ctx = {system: {platform: {linux: false}}};

        return mysqlCheck.task(ctx).then(() => {
            expect(execaStub.calledOnce).to.be.true;
            expect(execaStub.args[0][1]).to.be.empty;
        });
    });

    it('calls confirm if execa rejects and allowPrompt is true', function () {
        const execaStub = sinon.stub(execa, 'shell').rejects();
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(true);
        const skipStub = sinon.stub();

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
        const execaStub = sinon.stub(execa, 'shell').rejects();
        const logStub = sinon.stub();
        const confirmStub = sinon.stub().resolves(false);

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
});
