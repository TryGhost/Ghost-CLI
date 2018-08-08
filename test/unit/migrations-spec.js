'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const createConfig = require('../utils/config-stub');

const fs = require('fs-extra');
const ghostUser = require('../../lib/utils/use-ghost-user');

const migrations = require('../../lib/migrations');

describe('Unit: Migrations', function () {
    afterEach(() => {
        sinon.restore();
    });

    describe('ensureSettingsFolder', function () {
        it('if ghost user owns directory, runs `sudo mkdir` as ghost user', function () {
            const ghostUserStub = sinon.stub(ghostUser, 'shouldUseGhostUser').returns(true);
            const sudoStub = sinon.stub().resolves();
            const config = createConfig();
            config.get.withArgs('paths.contentPath').returns('/var/www/ghost/content');

            const context = {
                instance: {config: config},
                ui: {sudo: sudoStub}
            };

            return migrations[0].task(context).then(() => {
                expect(ghostUserStub.calledOnce).to.be.true;
                expect(ghostUserStub.calledWithExactly('/var/www/ghost/content')).to.be.true;
                expect(sudoStub.calledOnce).to.be.true;
                expect(sudoStub.calledWithExactly(
                    'mkdir -p /var/www/ghost/content/settings',
                    {sudoArgs: '-E -u ghost'}
                )).to.be.true;
            });
        });

        it('if ghost user doesn\'t own directory, runs basic mkdir', function () {
            const ghostUserStub = sinon.stub(ghostUser, 'shouldUseGhostUser').returns(false);
            const fsStub = sinon.stub(fs, 'ensureDirSync');
            const config = createConfig();
            config.get.withArgs('paths.contentPath').returns('/var/www/ghost/content');

            const context = {instance: {config: config}};

            return migrations[0].task(context).then(() => {
                expect(ghostUserStub.calledOnce).to.be.true;
                expect(ghostUserStub.calledWithExactly('/var/www/ghost/content')).to.be.true;
                expect(fsStub.calledOnce).to.be.true;
                expect(fsStub.calledWithExactly('/var/www/ghost/content/settings')).to.be.true;
            });
        });
    });
});
