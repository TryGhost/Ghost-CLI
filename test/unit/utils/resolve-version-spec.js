/* jshint expr:true */
var expect = require('chai').expect,
    rewire = require('rewire'),
    Promise = require('bluebird'),

    resolveVersion = rewire('../../../lib/utils/resolve-version');

describe('Unit: resolveVersion', function () {
    it('rejects for versions less than 1.0.0-alpha.1', function () {
        return resolveVersion('0.11.0').then(function () {
            throw new Error('Version finder should not have resolved.');
        }).catch(function (error) {
            expect(error).to.equal('Ghost-CLI cannot install versions of Ghost less than 1.0.0');
        });
    });

    it('rejects if result from npm is invalid JSON', function () {
        var reset = resolveVersion.__set__('npm', function () {
            return Promise.resolve('invalid json');
        });

        return resolveVersion().then(function () {
            throw new Error('Version finder should not have resolved.');
        }).catch(function (error) {
            expect(error).to.equal('Ghost-CLI was unable to load versions from NPM.');
            reset();
        });
    });

    it('rejects if no versions are found', function () {
        var reset = resolveVersion.__set__('npm', function () {
            return Promise.resolve('[]');
        });

        return resolveVersion().then(function () {
            throw new Error('Version finder should not have resolved');
        }).catch(function (error) {
            expect(error).to.equal('No valid versions found.');
            reset();
        });
    });

    describe('without existing version', function () {
        it('correctly filters out versions less than 1.0.0-alpha.1', function () {
            var reset = resolveVersion.__set__('npm', function () {
                return Promise.resolve('["0.10.1", "0.11.0"]');
            });

            return resolveVersion().then(function () {
                throw new Error('Version finder should not have resolved');
            }).catch(function (error) {
                expect(error).to.equal('No valid versions found.');
                reset();
            });
        });

        it('errors if specified version is not in list of valid versions', function () {
            var reset = resolveVersion.__set__('npm', function () {
                return Promise.resolve('["1.0.0", "1.0.1"]');
            });

            return resolveVersion('1.0.5').then(function () {
                throw new Error('Version finder should not have resolved');
            }).catch(function (error) {
                expect(error).to.equal('Invalid version specified: 1.0.5');
                reset();
            });
        });

        it('resolves with specified version if it exists and is valid', function () {
            var reset = resolveVersion.__set__('npm', function () {
                return Promise.resolve('["1.0.0", "1.0.1"]');
            });

            return resolveVersion('1.0.0').then(function (version) {
                expect(version).to.equal('1.0.0');
                reset();
            });
        });

        it('resolves with latest version if no version specified', function () {
            var reset = resolveVersion.__set__('npm', function () {
                return Promise.resolve('["1.0.0", "1.0.1"]');
            });

            return resolveVersion().then(function (version) {
                expect(version).to.equal('1.0.1');
                reset();
            });
        });
    });

    describe('with existing version', function () {
        it('correctly filters out all versions greater than the specified one', function () {
            var reset = resolveVersion.__set__('npm', function () {
                return Promise.resolve('["1.0.0", "1.0.1"]');
            });

            return resolveVersion(null, '1.0.1').then(function () {
                throw new Error('Version finder should not have resolved');
            }).catch(function (error) {
                expect(error).to.equal('No valid versions found.');
                reset();
            });
        });
    });
});
