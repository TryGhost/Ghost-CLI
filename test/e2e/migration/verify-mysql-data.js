// Compares every row of the source SQLite database with the MySQL database a
// mysql-data bundle was loaded into, and checks the manifest's row counts.
// Deliberately independent of lib/tasks/migration-export/sqlite.js.
//
// Usage: MYSQL_PORT=33306 node verify-mysql-data.js <ghost.db> <bundle dir>
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {DatabaseSync} = require('node:sqlite');
const mysql = require('mysql2/promise');

const [sqliteFile, bundleDir] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(path.join(bundleDir, 'manifest.json'), 'utf8'));
assert.equal(manifest.kind, 'mysql-data');

const NUMERIC = ['tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'float', 'double'];
const pad = n => String(n).padStart(2, '0');
const formatDate = date => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;

// What the source value must look like once it is in MySQL
function expected(table, column, type, value) {
    if (value === null) {
        return null;
    }
    if (table === 'migrations_lock' && column.name === 'locked') {
        return '0';
    }
    if (type === 'blob') {
        return `0x${Buffer.from(value).toString('hex')}`;
    }
    if (type === 'text') {
        const text = Buffer.from(value).toString('utf8');
        if (column.declared === 'datetime' && text.includes('T')) {
            return formatDate(new Date(text));
        }
        return text;
    }
    if (column.declared === 'datetime') {
        return formatDate(new Date(Number(value)));
    }
    return type === 'integer' ? BigInt(value).toString() : String(Number(value));
}

function actual(dataType, value) {
    if (value === null) {
        return null;
    }
    if (Buffer.isBuffer(value)) {
        return `0x${value.toString('hex')}`;
    }
    if (NUMERIC.includes(dataType)) {
        return ['decimal', 'float', 'double'].includes(dataType) ? String(Number(value)) : BigInt(value).toString();
    }
    return String(value);
}

(async () => {
    const sqlite = new DatabaseSync(sqliteFile, {readOnly: true});
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'root',
        database: process.env.MYSQL_DATABASE || 'ghost',
        dateStrings: true,
        supportBigNumbers: true,
        bigNumberStrings: true
    });

    const tables = sqlite.prepare('SELECT name FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite_%\' ORDER BY name').all().map(t => t.name);
    assert.deepEqual(Object.keys(manifest.database.rows).sort(), tables, 'manifest row counts cover every SQLite table');

    let cells = 0;
    for (const table of tables) {
        const columns = sqlite.prepare('SELECT name, lower(type) AS declared FROM pragma_table_info(?) ORDER BY cid').all(table);
        const select = columns.map((c, i) => `typeof("${c.name}") AS t${i}, CASE typeof("${c.name}") WHEN 'text' THEN CAST("${c.name}" AS BLOB) ELSE "${c.name}" END AS v${i}`).join(', ');
        const statement = sqlite.prepare(`SELECT ${select} FROM "${table}"`);
        statement.setReadBigInts(true);
        const source = statement.all().map(row => JSON.stringify(columns.map((c, i) => expected(table, c, row[`t${i}`], row[`v${i}`])))).sort();

        const [types] = await connection.query('SELECT COLUMN_NAME AS name, DATA_TYPE AS type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
        const dataTypes = Object.fromEntries(types.map(c => [c.name, c.type]));
        const [rows] = await connection.query(`SELECT ${columns.map(c => `\`${c.name}\``).join(', ')} FROM \`${table}\``);
        const loaded = rows.map(row => JSON.stringify(columns.map(c => actual(dataTypes[c.name], row[c.name])))).sort();

        assert.equal(manifest.database.rows[table], source.length, `${table}: manifest row count`);
        assert.equal(loaded.length, source.length, `${table}: MySQL row count`);
        source.forEach((row, i) => assert.equal(loaded[i], row, `${table}: row differs`));
        cells += source.length * columns.length;
    }

    await connection.end();
    sqlite.close();
    console.log(`Verified ${tables.length} tables, ${cells} values`);
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
