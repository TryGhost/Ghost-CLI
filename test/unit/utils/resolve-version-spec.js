'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire');

let resolveVersion;

function stubYarn(result) {
    resolveVersion = proxyquire('../../../lib/utils/resolve-version', {
        './yarn': function () {
            return Promise.resolve({stdout: result});
        }
    });
}

describe('Unit: resolveVersion', function () {
    it('rejects for versions less than 1.0.0-alpha.1', function () {
        stubYarn('');

        return resolveVersion('0.11.0').then(function () {
            throw new Error('Version finder should not have resolved.');
        }).catch(function (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal('Ghost-CLI cannot install versions of Ghost less than 1.0.0');
        });
    });

    it('rejects if result from yarn is invalid JSON', function () {
        stubYarn('invalid json');

        return resolveVersion().then(function () {
            throw new Error('Version finder should not have resolved.');
        }).catch(function (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal('Ghost-CLI was unable to load versions from Yarn.');
        });
    });

    it('rejects if no versions are found', function () {
        stubYarn('{"data": []}');

        return resolveVersion().then(function () {
            throw new Error('Version finder should not have resolved');
        }).catch(function (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal('No valid versions found.');
        });
    });

    describe('without existing version', function () {
        it('correctly filters out versions less than 1.0.0-alpha.1', function () {
            stubYarn('{"data": ["0.10.1", "0.11.0"]}');

            return resolveVersion().then(function () {
                throw new Error('Version finder should not have resolved');
            }).catch(function (error) {
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.equal('No valid versions found.');
            });
        });

        it('errors if specified version is not in list of valid versions', function () {
            stubYarn('{"data": ["1.0.0", "1.0.1"]}');

            return resolveVersion('1.0.5').then(function () {
                throw new Error('Version finder should not have resolved');
            }).catch(function (error) {
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.equal('Invalid version specified: 1.0.5');
            });
        });

        it('resolves with specified version if it exists and is valid', function () {
            stubYarn('{"data": ["1.0.0", "1.0.1"]}');

            return resolveVersion('1.0.0').then(function (version) {
                expect(version).to.equal('1.0.0');
            });
        });

        it('allows a v in front of the version number', function () {
            stubYarn('{"data": ["1.0.0", "1.0.1"]}');

            return resolveVersion('v1.0.0').then(function (version) {
                expect(version).to.equal('1.0.0');
            });
        });

        it('resolves with latest version if no version specified', function () {
            stubYarn('{"data": ["1.0.0", "1.0.1"]}');

            return resolveVersion().then(function (version) {
                expect(version).to.equal('1.0.1');
            });
        });
    });

    describe('with existing version', function () {
        it('correctly filters out all versions greater than the specified one', function () {
            stubYarn('{"data": ["1.0.0", "1.0.1"]}');

            return resolveVersion(null, '1.0.1').then(function () {
                throw new Error('Version finder should not have resolved');
            }).catch(function (error) {
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.equal('No valid versions found.');
            });
        });
    });
});
