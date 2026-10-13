'use strict';
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const modulePath = '../../../lib/tasks/backup';

describe('Unit: Tasks > Backup', function () {
    function setup(shouldUseGhostUser) {
        const ui = {sudo: sinon.stub().resolves()};
        const instance = {
            dir: '/var/www/ghost',
            version: '6.0.0',
            config: {get: sinon.stub().withArgs('paths.contentPath').returns('/var/www/ghost/content')}
        };
        const copyFile = sinon.stub().resolves();

        const backup = proxyquire(modulePath, {
            '@tryghost/zip': {compress: sinon.stub().resolves()},
            'node:fs': {existsSync: path => path.includes('redirects.json')},
            'node:fs/promises': {mkdir: sinon.stub().resolves(), copyFile},
            '../utils/use-ghost-user': {shouldUseGhostUser: () => shouldUseGhostUser},
            './import': {exportTask: sinon.stub().resolves()}
        });

        return {backup, ui, instance, copyFile};
    }

    it('copies files as the ghost user when content is ghost-owned', async function () {
        const {backup, ui, instance, copyFile} = setup(true);

        await backup(ui, instance);

        const copyCall = ui.sudo.getCalls().find(call => call.args[0][0] === 'cp');
        expect(copyCall.args).to.deep.equal([
            ['cp', '/var/www/ghost/content/data/redirects.json', '/var/www/ghost/content/settings/redirects.json'],
            {sudoArgs: ['-u', 'ghost']}
        ]);
        expect(ui.sudo.getCalls().some(call => call.args[0][0] === 'chown')).to.be.false;
        expect(copyFile.called).to.be.false;
    });

    it('copies files directly when not using the ghost user', async function () {
        const {backup, ui, instance, copyFile} = setup(false);

        await backup(ui, instance);

        expect(ui.sudo.called).to.be.false;
        expect(
            copyFile.calledOnceWithExactly(
                '/var/www/ghost/content/data/redirects.json',
                '/var/www/ghost/content/settings/redirects.json'
            )
        ).to.be.true;
    });
});
