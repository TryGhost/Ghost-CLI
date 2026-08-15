'use strict';
const fs = require('node:fs');
const path = require('path');
const tmp = require('tmp');

const {readJSON, readJSONSync, writeJSONSync} = require('../../../lib/utils/json');

function writeFixture(contents) {
    const {name: file} = tmp.fileSync();
    fs.writeFileSync(file, contents);
    return file;
}

describe('Unit: Utils > json', function () {
    describe('readJSONSync', function () {
        it('parses a json file', function () {
            expect(readJSONSync(writeFixture('{"a": "b"}'))).to.deep.equal({a: 'b'});
        });

        it('parses a json file that starts with a BOM', function () {
            expect(readJSONSync(writeFixture('\uFEFF{"a": "b"}'))).to.deep.equal({a: 'b'});
        });

        it('throws for invalid json', function () {
            expect(() => readJSONSync(writeFixture('not json'))).to.throw(SyntaxError);
        });
    });

    describe('readJSON', function () {
        it('parses a json file', async function () {
            expect(await readJSON(writeFixture('{"a": "b"}'))).to.deep.equal({a: 'b'});
        });

        it('parses a json file that starts with a BOM', async function () {
            expect(await readJSON(writeFixture('\uFEFF{"a": "b"}'))).to.deep.equal({a: 'b'});
        });
    });

    describe('writeJSONSync', function () {
        it('writes indented json with a trailing newline', function () {
            const file = path.join(tmp.dirSync({unsafeCleanup: true}).name, 'out.json');
            writeJSONSync(file, {a: 'b'});

            expect(fs.readFileSync(file, 'utf8')).to.equal('{\n  "a": "b"\n}\n');
        });

        it('round-trips through readJSONSync', function () {
            const file = path.join(tmp.dirSync({unsafeCleanup: true}).name, 'out.json');
            const values = {a: 'b', nested: {c: [1, 2]}};
            writeJSONSync(file, values);

            expect(readJSONSync(file)).to.deep.equal(values);
        });
    });
});
