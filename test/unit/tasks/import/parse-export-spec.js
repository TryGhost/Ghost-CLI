const {expect} = require('chai');
const sinon = require('sinon');
const fs = require('fs-extra');
const path = require('path');

const {SystemError} = require('../../../../lib/errors');

const parseExport = require('../../../../lib/tasks/import/parse-export');

describe('Unit > Tasks > Import > parse-export', function () {
    afterEach(() => {
        sinon.restore();
    });

    it('forwards error from readJsonSync', function () {
        const stub = sinon.stub(fs, 'readJsonSync').throws(new Error('file not found'));

        try {
            parseExport('notfoundfile.json');
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('file not found');
            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWithExactly('notfoundfile.json')).to.be.true;
            return;
        }

        expect.fail('parseImport should have errored');
    });

    it('throws error if version can\'t be determined', function () {
        const stub = sinon.stub(fs, 'readJsonSync').returns({});

        try {
            parseExport('unrecognized.json');
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('Unable to determine export version');
            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWithExactly('unrecognized.json')).to.be.true;
            return;
        }

        expect.fail('parseImport should have errored');
    });

    it('throws error if unrecognized version', function () {
        const stub = sinon.stub(fs, 'readJsonSync').returns({
            meta: {version: 'this isnt semver'}
        });

        try {
            parseExport('unrecognized.json');
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('Unrecognized export version: this isnt semver');
            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWithExactly('unrecognized.json')).to.be.true;
            return;
        }

        expect.fail('parseImport should have errored');
    });

    it('returns correct data for 0.x export file', function () {
        const result = parseExport(path.join(__dirname, 'fixtures/0.11.x.json'));
        expect(result).to.deep.equal({
            version: '0.11.14',
            data: {
                name: 'Test 0.x User',
                email: 'test@example.com',
                blogTitle: 'Test 0.x Blog'
            }
        });
    });

    it('returns correct data for 1.x export file', function () {
        const result = parseExport(path.join(__dirname, 'fixtures/1.x.json'));
        expect(result).to.deep.equal({
            version: '1.26.0',
            data: {
                name: 'Test 1.x User',
                email: 'test@example.com',
                blogTitle: 'Test 1.x Blog'
            }
        });
    });

    it('returns correct data for 2.x export file', function () {
        const result = parseExport(path.join(__dirname, 'fixtures/2.x.json'));
        expect(result).to.deep.equal({
            version: '2.37.0',
            data: {
                name: 'Test 2.x User',
                email: 'test@example.com',
                blogTitle: 'Test 2.x Blog'
            }
        });
    });

    it('returns correct data for 3.x export file', function () {
        const result = parseExport(path.join(__dirname, 'fixtures/3.x.json'));
        expect(result).to.deep.equal({
            version: '3.0.2',
            data: {
                name: 'Test 3.x User',
                email: 'test@example.com',
                blogTitle: 'Test 3.x Blog'
            }
        });
    });
});
