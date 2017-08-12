'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const Promise = require('bluebird');

const modulePath = '../../../lib/tasks/linux';

function fakeListr(tasks, ctx) {
    expect(ctx).to.be.false;
    return Promise.each(tasks, (task) => {
        if (task.skip && task.skip()) {
            return;
        }

        return task.task();
    });
}

describe('Unit: Tasks > linux', function () {
    it('rejects if execa error message is not an expected one', function () {
        const shellStub = sinon.stub().throws(new Error('unexpected'));
        const linux = proxyquire(modulePath, {
            execa: {shellSync: shellStub}
        });
        const listrStub = sinon.stub();
        return linux({ui: {listr: listrStub}}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(Error);
            expect(error.message).to.equal('unexpected');
            expect(shellStub.calledOnce).to.be.true;
            expect(shellStub.calledWithExactly('id ghost')).to.be.true;
            expect(listrStub.called).to.be.false;
        });
    });

    it('skips creating user if user already exists', function () {
        const shellStub = sinon.stub();
        const linux = proxyquire(modulePath, {
            execa: {shellSync: shellStub}
        });
        const listrStub = sinon.stub().callsFake(fakeListr);

        const sudoStub = sinon.stub().resolves();
        const ui = {sudo: sudoStub, listr: listrStub};

        return linux({ui: ui, instance: {dir: '/var/www/ghost'}}).then(() => {
            expect(shellStub.calledOnce).to.be.true;
            expect(listrStub.calledOnce).to.be.true;
            expect(sudoStub.calledOnce).to.be.true;
            expect(sudoStub.calledWithExactly('chown -R ghost:ghost /var/www/ghost/content')).to.be.true;
        });
    });

    it('creates creating user if user already exists', function () {
        const shellStub = sinon.stub().throws(new Error('No such user'));
        const linux = proxyquire(modulePath, {
            execa: {shellSync: shellStub}
        });
        const listrStub = sinon.stub().callsFake(fakeListr);
        const sudoStub = sinon.stub().resolves();
        const ui = {sudo: sudoStub, listr: listrStub};

        return linux({ui: ui, instance: {dir: '/var/www/ghost'}}).then(() => {
            expect(shellStub.calledOnce).to.be.true;
            expect(listrStub.calledOnce).to.be.true;
            expect(sudoStub.calledTwice).to.be.true;
            expect(sudoStub.args[0][0]).to.equal('useradd --system --user-group ghost');
            expect(sudoStub.args[1][0]).to.equal('chown -R ghost:ghost /var/www/ghost/content');
        });
    });
});
