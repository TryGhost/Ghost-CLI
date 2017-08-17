'use strict';
const expect = require('chai').expect;
const fs = require('fs-extra');

const Config = require('../../../lib/utils/config');

describe('Unit: Config', function () {
    let test;

    it('errors when no filename is specified on creation', function () {
        try {
            test = new Config();
            throw new Error('Error should have been thrown');
        } catch (e) {
            expect(e.message).to.equal('Config file not specified.');
        }
    });

    it('loads values from file correctly', function () {
        fs.writeJsonSync('config-test.json', {test: 'a'});
        test = new Config('config-test.json');
        expect(test.values).to.deep.equal({test: 'a'});
        fs.removeSync('config-test.json');
    });

    it('loads empty value set when file does not exist', function () {
        test = new Config('config-test.json');
        expect(test.values).to.deep.equal({});
    });

    describe('get()', function () {
        beforeEach(function () {
            fs.writeJsonSync('config-test.json', {a: 'b'});
            test = new Config('config-test.json');
        });

        afterEach(function () {
            fs.removeSync('config-test.json');
        });

        it('returns value correctly', function () {
            expect(test.get('a')).to.equal('b');
        });

        it('returns default value if key does not exist', function () {
            expect(test.get('asdf', 'b')).to.equal('b');
        });
    });

    describe('set()', function () {
        beforeEach(function () {
            fs.writeJsonSync('config-test.json', {});
            test = new Config('config-test.json');
        });

        afterEach(function () {
            fs.removeSync('config-test.json');
        });

        it('sets single value correctly', function () {
            test.set('a', 'b');
            expect(test.values).to.deep.equal({a: 'b'});
        });

        it('sets multiple values correctly', function () {
            test.set({a: 'b', c: 'd'});
            expect(test.values).to.deep.equal({a: 'b', c: 'd'});
        });

        it('removes value when set is passed a null value', function () {
            test.set('a', 'b');
            expect(test.values).to.deep.equal({a: 'b'});
            test.set('a', null);
            expect(test.values).to.deep.equal({});
        });
    });

    describe('has()', function () {
        it('returns false when value does not exist', function () {
            test = new Config('config-test.json');
            expect(test.has('a')).to.be.false;
        });

        it('returns true when value exists', function () {
            fs.writeJsonSync('config-test.json', {a: 'b'});
            test = new Config('config-test.json');
            expect(test.has('a')).to.be.true;
            fs.removeSync('config-test.json');
        });

        it('returns true when value exists and is false', function () {
            fs.writeJsonSync('config-test.json', {a: false});
            test = new Config('config-test.json');
            expect(test.has('a')).to.be.true;
            fs.removeSync('config-test.json');
        });
    });

    describe('save()', function () {
        it('saves file correctly', function () {
            fs.writeJsonSync('config-test.json', {});
            test = new Config('config-test.json');
            test.set('a', 'b').save();
            expect(fs.readJsonSync('config-test.json')).to.deep.equal({a: 'b'});
            fs.removeSync('config-test.json');
        });
    });

    describe('exists()', function () {
        it('returns false if file does not exist', function () {
            const result = Config.exists('does-not-exist.txt');

            expect(result).to.be.false;
        });

        it('returns false if file contains invalid JSON', function () {
            fs.writeFileSync('config-test.json', 'invalid json');
            const result = Config.exists('config-test.json');
            expect(result).to.be.false;
            fs.removeSync('config-test.json');
        });

        it('returns parsed contents of file if valid JSON', function () {
            fs.writeJsonSync('config-test.json', {test: 'a'});
            const result = Config.exists('config-test.json');
            expect(result.test).to.equal('a');
            fs.removeSync('config-test.json');
        });
    });
});
