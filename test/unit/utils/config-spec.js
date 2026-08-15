'use strict';
const fs = require('node:fs');

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
        fs.writeFileSync('config-test.json', JSON.stringify({test: 'a'}));
        test = new Config('config-test.json');
        expect(test.values).to.deep.equal({test: 'a'});
        fs.rmSync('config-test.json', {force: true});
    });

    it('loads empty value set when file does not exist', function () {
        test = new Config('config-test.json');
        expect(test.values).to.deep.equal({});
    });

    describe('get()', function () {
        beforeEach(function () {
            fs.writeFileSync('config-test.json', JSON.stringify({a: 'b'}));
            test = new Config('config-test.json');
        });

        afterEach(function () {
            fs.rmSync('config-test.json', {force: true});
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
            fs.writeFileSync('config-test.json', JSON.stringify({}));
            test = new Config('config-test.json');
        });

        afterEach(function () {
            fs.rmSync('config-test.json', {force: true});
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
            fs.writeFileSync('config-test.json', JSON.stringify({a: 'b'}));
            test = new Config('config-test.json');
            expect(test.has('a')).to.be.true;
            fs.rmSync('config-test.json', {force: true});
        });

        it('returns true when value exists and is false', function () {
            fs.writeFileSync('config-test.json', JSON.stringify({a: false}));
            test = new Config('config-test.json');
            expect(test.has('a')).to.be.true;
            fs.rmSync('config-test.json', {force: true});
        });
    });

    describe('save()', function () {
        it('saves file correctly', function () {
            fs.writeFileSync('config-test.json', JSON.stringify({}));
            test = new Config('config-test.json');
            test.set('a', 'b').save();
            expect(JSON.parse(fs.readFileSync('config-test.json', 'utf8'))).to.deep.equal({a: 'b'});
            fs.rmSync('config-test.json', {force: true});
        });

        it('writes indented json with a trailing newline', function () {
            test = new Config('config-test.json');
            test.set('a', 'b').save();
            expect(fs.readFileSync('config-test.json', 'utf8')).to.equal('{\n  "a": "b"\n}\n');
            fs.rmSync('config-test.json', {force: true});
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
            fs.rmSync('config-test.json', {force: true});
        });

        it('returns parsed contents of file if valid JSON', function () {
            fs.writeFileSync('config-test.json', JSON.stringify({test: 'a'}));
            const result = Config.exists('config-test.json');
            expect(result.test).to.equal('a');
            fs.rmSync('config-test.json', {force: true});
        });
    });
});
