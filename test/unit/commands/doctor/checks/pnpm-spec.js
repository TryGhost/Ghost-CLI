const sinon = require('sinon');
const proxyquire = require('proxyquire');

const {SystemError} = require('../../../../../lib/errors');

const modulePath = '../../../../../lib/commands/doctor/checks/pnpm';

function setup(execa) {
    return proxyquire(modulePath, {execa: {execa}});
}

function versionOf(command, versions) {
    return versions[command] ? Promise.resolve({stdout: `${versions[command]}\n`}) : Promise.reject(new Error(`${command} not found`));
}

describe('Unit: Doctor Checks > pnpm', function () {
    describe('enabled', function () {
        const pnpmCheck = require(modulePath);

        it('returns false when no version is in context', function () {
            expect(pnpmCheck.enabled({})).to.be.false;
        });

        it('returns false for Ghost versions that do not use pnpm', function () {
            expect(pnpmCheck.enabled({version: '6.29.0'})).to.be.false;
        });

        it('returns true for Ghost versions that use pnpm', function () {
            expect(pnpmCheck.enabled({version: '6.30.0'})).to.be.true;
        });
    });

    describe('task', function () {
        it('passes when pnpm is new enough for the pinned pnpm version', async function () {
            const execa = sinon.stub().callsFake(cmd => versionOf(cmd, {pnpm: '11.10.0'}));
            const task = {};

            await setup(execa).task({version: '6.62.0'}, task);
            expect(task.title).to.contain('found pnpm v11.10.0');
        });

        it('errors when pnpm is too old to install the pnpm version Ghost pins', async function () {
            const execa = sinon.stub().callsFake(cmd => versionOf(cmd, {pnpm: '10.33.0'}));

            const error = await setup(execa).task({version: '6.62.0'}, {}).then(() => null, err => err);

            expect(error).to.be.an.instanceOf(SystemError);
            expect(error.message).to.contain('pnpm v10.33.0 is too old');
            expect(error.options.suggestion).to.equal('npm install -g pnpm@latest');
        });

        it('allows an older pnpm for Ghost versions that do not pin pnpm 12', async function () {
            const execa = sinon.stub().callsFake(cmd => versionOf(cmd, {pnpm: '10.33.0'}));
            const task = {};

            await setup(execa).task({version: '6.61.0'}, task);
            expect(task.title).to.contain('found pnpm v10.33.0');
        });

        it('does not block on a pnpm version it cannot parse', async function () {
            const execa = sinon.stub().callsFake(cmd => versionOf(cmd, {pnpm: 'unknown'}));
            const task = {};

            await setup(execa).task({version: '6.62.0'}, task);
            expect(task.title).to.contain('found pnpm vunknown');
        });

        it('falls back to corepack when pnpm is not installed', async function () {
            const execa = sinon.stub().callsFake(cmd => versionOf(cmd, {corepack: '0.34.6'}));
            const task = {};

            await setup(execa).task({version: '6.62.0'}, task);
            expect(task.title).to.contain('found corepack v0.34.6');
        });

        it('errors when neither pnpm nor corepack is available', async function () {
            const execa = sinon.stub().callsFake(cmd => versionOf(cmd, {}));

            const error = await setup(execa).task({version: '6.62.0'}, {}).then(() => null, err => err);

            expect(error).to.be.an.instanceOf(SystemError);
            expect(error.message).to.contain('pnpm is not installed');
        });
    });
});
