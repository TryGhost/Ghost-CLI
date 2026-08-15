'use strict';

const {get, set, has} = require('../../../lib/utils/object-path');

describe('Unit: Utils > object-path', function () {
    describe('get()', function () {
        it('returns top level values', function () {
            expect(get({a: 'b'}, 'a')).to.equal('b');
        });

        it('returns nested values', function () {
            expect(get({a: {b: {c: 'd'}}}, 'a.b.c')).to.equal('d');
        });

        it('returns falsy values as-is', function () {
            expect(get({a: {b: false}}, 'a.b')).to.be.false;
            expect(get({a: {b: null}}, 'a.b', 'default')).to.be.null;
        });

        it('returns the default value when the path does not resolve', function () {
            expect(get({a: 'b'}, 'c', 'default')).to.equal('default');
            expect(get({a: 'b'}, 'a.b.c', 'default')).to.equal('default');
            expect(get({}, 'a.b')).to.be.undefined;
        });
    });

    describe('set()', function () {
        it('sets top level values', function () {
            const obj = {};
            set(obj, 'a', 'b');
            expect(obj).to.deep.equal({a: 'b'});
        });

        it('creates missing intermediate objects', function () {
            const obj = {};
            set(obj, 'a.b.c', 'd');
            expect(obj).to.deep.equal({a: {b: {c: 'd'}}});
        });

        it('overwrites non-object intermediate values', function () {
            const obj = {a: 'b'};
            set(obj, 'a.b', 'c');
            expect(obj).to.deep.equal({a: {b: 'c'}});
        });

        it('leaves sibling values alone', function () {
            const obj = {a: {b: 'c'}};
            set(obj, 'a.d', 'e');
            expect(obj).to.deep.equal({a: {b: 'c', d: 'e'}});
        });
    });

    describe('has()', function () {
        it('returns true for existing values, including falsy ones', function () {
            expect(has({a: 'b'}, 'a')).to.be.true;
            expect(has({a: {b: false}}, 'a.b')).to.be.true;
            expect(has({a: {b: undefined}}, 'a.b')).to.be.true;
        });

        it('returns false when the path does not resolve', function () {
            expect(has({a: 'b'}, 'c')).to.be.false;
            expect(has({a: 'b'}, 'a.b')).to.be.false;
            expect(has({}, 'a.b.c')).to.be.false;
        });

        it('ignores inherited properties', function () {
            expect(has({}, 'toString')).to.be.false;
        });
    });
});
