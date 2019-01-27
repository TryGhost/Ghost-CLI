const proxyquire = require('proxyquire');
const {expect} = require('chai');

const proxy = files => proxyquire('../../../lib/utils/dir-is-empty', {
    fs: {readdirSync: () => files}
});

describe('Unit: Utils > dirIsEmpty', function () {
    it('returns true if directory is empty', function () {
        const fn = proxy([]);
        expect(fn('dir')).to.be.true;
    });

    it('returns true if directory contains ghost debug log files', function () {
        const fn = proxy(['ghost-cli-debug-1234.log']);
        expect(fn('dir')).to.be.true;
    });

    it('returns true if directory contains dotfiles other than .ghost-cli', function () {
        const fn = proxy(['.npmrc', '.gitignore']);
        expect(fn('dir')).to.be.true;
    });

    it('returns false if directory contains .ghost-cli file', function () {
        const fn = proxy(['.ghost-cli']);
        expect(fn('dir')).to.be.false;
    });

    it('returns false if directory contains other files', function () {
        const fn = proxy(['file.txt', 'file2.txt']);
        expect(fn('dir')).to.be.false;
    });
});
