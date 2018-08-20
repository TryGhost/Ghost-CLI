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

    it('defaults versions to none', function () {
        stubYarn('{}');

        return resolveVersion().then(function () {
            throw new Error('Version finder should not have resolved.');
        }).catch(function (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal('No valid versions found.');
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

        it('filters out 2.0 version if v1 param is specified', function () {
            stubYarn('{"data": ["1.0.0", "1.0.1", "1.52.37", "2.0.0", "2.0.1"]}');

            return resolveVersion(null, null, true).then(function (version) {
                expect(version).to.equal('1.52.37');
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

        it('filters out 2.0 version if v1 param is specified', function () {
            stubYarn('{"data": ["1.0.0", "1.0.1", "1.52.37", "2.0.0", "2.0.1"]}');

            return resolveVersion(null, '1.52.37', true).then(function () {
                throw new Error('Version finder should not have resolved');
            }).catch(function (error) {
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.equal('No valid versions found.');
            });
        });

        it('allows upgrading from v2 to next v2', function () {
            stubYarn('{"data": ["1.23.0", "1.25.1", "1.25.2", "2.0.0", "2.0.1"]}');

            return resolveVersion(null, '2.0.0').then(function (version) {
                expect(version).to.equal('2.0.1');
            });
        });

        describe('jump to next major', function () {
            it('throws error if you aren\'t on the latest v1', function () {
                stubYarn('{"data": ["1.23.0", "1.24.0", "1.25.0", "2.0.0", "2.0.1"]}');

                return resolveVersion(null, '1.24.0', false).then(function () {
                    throw new Error('Version finder should not have resolved');
                }).catch(function (error) {
                    expect(error).to.be.an.instanceOf(Error);
                    expect(error.message).to.equal('You are about to migrate to Ghost 2.0. Your blog is not on the latest Ghost 1.0 version.');
                });
            });

            it('resolves if you are on the latest v1', function () {
                stubYarn('{"data": ["1.23.0", "1.25.1", "1.25.2", "2.0.0", "2.0.1"]}');

                return resolveVersion(null, '1.25.2', false)
                    .then(function (version) {
                        expect(version).to.eql('2.0.1');
                    });
            });

            it('resolves using `--v1` and you are\'t on the latest v1', function () {
                stubYarn('{"data": ["1.23.0", "1.25.1", "1.25.2", "2.0.0", "2.0.1"]}');

                return resolveVersion(null, '1.25.1', true)
                    .then(function (version) {
                        expect(version).to.eql('1.25.2');
                    });
            });

            it('updates to latest v2 with many v2 releases', function () {
                stubYarn('{"data": ["1.23.0", "1.25.1", "1.25.2", "2.0.0", "2.1.0", "2.2.0"]}');

                return resolveVersion(null, '1.25.2', false, false)
                    .then(function (version) {
                        expect(version).to.eql('2.2.0');
                    });
            });

            it('force updating and you are on the latest v1', function () {
                stubYarn('{"data": ["1.23.0", "1.25.1", "1.25.2", "2.0.0", "2.0.1"]}');

                return resolveVersion(null, '1.25.2', false, true)
                    .then(function (version) {
                        expect(version).to.eql('2.0.1');
                    });
            });

            it('force updating with `--v1`', function () {
                stubYarn('{"data": ["1.23.0", "1.25.1", "1.25.2", "2.0.0", "2.0.1"]}');

                return resolveVersion(null, '1.25.1', true, true)
                    .then(function (version) {
                        expect(version).to.eql('1.25.2');
                    });
            });

            it('force updating with many v2 releases', function () {
                stubYarn('{"data": ["1.23.0", "1.25.1", "1.25.2", "2.0.0", "2.1.0", "2.2.0"]}');

                return resolveVersion(null, '1.25.1', false, true)
                    .then(function (version) {
                        expect(version).to.eql('1.25.2');
                    });
            });

            it('throws error if you want to force updating to a previous major', function () {
                stubYarn('{"data": ["1.23.0", "1.25.1", "1.25.2", "2.0.0"]}');

                return resolveVersion(null, '2.0.0', true, true)
                    .then(function () {
                        throw new Error('Version finder should not have resolved');
                    })
                    .catch(function (error) {
                        expect(error).to.be.an.instanceOf(Error);
                        expect(error.message).to.equal('No valid versions found.');
                    });
            });

            it('throws error if you want to update to a previous major', function () {
                stubYarn('{"data": ["1.23.0", "1.25.1", "1.25.2", "2.0.0"]}');

                return resolveVersion(null, '2.0.0', true, false)
                    .then(function () {
                        throw new Error('Version finder should not have resolved');
                    })
                    .catch(function (error) {
                        expect(error).to.be.an.instanceOf(Error);
                        expect(error.message).to.equal('No valid versions found.');
                    });
            });
        });
    });
});
