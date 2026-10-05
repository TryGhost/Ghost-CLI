'use strict';
const fs = require('node:fs');
const path = require('path');
const {once} = require('node:events');
const {escape, escapeId} = require('mysql2');

const {SystemError} = require('../../errors');

// Keep each INSERT well under MySQL's default 64MB max_allowed_packet
const MAX_STATEMENT_BYTES = 1024 * 1024;
const MAX_STATEMENT_ROWS = 1000;
// Stop collecting problems once there are enough to act on
const MAX_PROBLEMS = 20;

const utf8 = new TextDecoder('utf-8', {fatal: true});

const HEADER = `-- Ghost-CLI migration data dump (kind: mysql-data)
--
-- Rows only, read from a Ghost SQLite database. Load this into a MySQL database
-- that Ghost (at the same version as the source) has already initialised: each
-- table is emptied and refilled, so the schema stays Ghost's canonical one.

SET NAMES utf8mb4;
SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_AUTO_VALUE_ON_ZERO,NO_ENGINE_SUBSTITUTION';
SET SESSION time_zone = '+00:00';
SET SESSION foreign_key_checks = 0;
START TRANSACTION;
`;

const FOOTER = `
COMMIT;
SET SESSION foreign_key_checks = 1;
`;

function openDatabase(filename) {
    const {DatabaseSync} = require('node:sqlite');
    return new DatabaseSync(filename, {readOnly: true});
}

/**
 * Resolves the SQLite database file for an instance
 *
 * @param {import('../../instance.js')} instance
 * @return {string}
 */
function databaseFile(instance) {
    const filename = instance.config.get('database.connection.filename');
    if (!filename) {
        throw new SystemError('No SQLite database filename found in the instance config');
    }

    const file = path.resolve(instance.dir, filename);
    if (!fs.existsSync(file)) {
        throw new SystemError(`SQLite database not found: ${file}`);
    }
    return file;
}

/**
 * Reads table, column and unique index definitions from the SQLite catalog
 *
 * @param {import('node:sqlite').DatabaseSync} db
 */
function introspect(db) {
    const tables = db.prepare(
        'SELECT name FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite_%\' ORDER BY name'
    ).all().map(row => row.name);

    return tables.map((name) => {
        const columns = db.prepare('SELECT name, type FROM pragma_table_info(?) ORDER BY cid').all(name).map((column) => {
            const type = (column.type || '').toLowerCase();
            const varchar = type.match(/^varchar\((\d+)\)$/);
            return {
                name: column.name,
                type,
                maxLength: varchar ? Number(varchar[1]) : null
            };
        });

        // MySQL allows repeated NULLs in a unique index, so only full keys matter.
        // Partial and expression indexes have no MySQL equivalent in Ghost's schema.
        const uniques = db.prepare('SELECT name FROM pragma_index_list(?) WHERE "unique" = 1 AND partial = 0').all(name)
            .map((index) => {
                const keyColumns = db.prepare('SELECT name FROM pragma_index_info(?) ORDER BY seqno').all(index.name).map(c => c.name);
                return {name: index.name, columns: keyColumns};
            })
            .filter(index => index.columns.length && index.columns.every(Boolean));

        return {name, columns, uniques};
    });
}

function pad(number, length = 2) {
    return String(number).padStart(length, '0');
}

function formatDate(date) {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
        `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

/**
 * Normalises a SQLite value to one MySQL accepts for the column's declared type.
 * Ghost stores dates as `YYYY-MM-DD HH:MM:SS` text in UTC, but rows written
 * outside the model layer can hold epoch milliseconds or ISO 8601 strings.
 */
function normalise(value, column) {
    if (value === null) {
        return null;
    }

    if (column.type === 'datetime') {
        if (typeof value === 'number' || typeof value === 'bigint') {
            return formatDate(new Date(Number(value)));
        }
        if (typeof value === 'string' && value.includes('T')) {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                return formatDate(date);
            }
        }
    }

    if (column.type === 'boolean' && typeof value === 'string') {
        if (value === 'true') {
            return 1;
        }
        if (value === 'false') {
            return 0;
        }
    }

    return value;
}

const MYSQL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?)?$/;

/**
 * Whether MySQL's strict mode accepts the value for a DATETIME column:
 * a real calendar date between the years 1000 and 9999
 */
function isMysqlDatetime(value) {
    const match = typeof value === 'string' && value.match(MYSQL_DATETIME);
    if (!match) {
        return false;
    }

    const [year, month, day, hours, minutes, seconds] = match.slice(1).map(part => Number(part || 0));
    const date = new Date(Date.UTC(year, month - 1, day));
    return year >= 1000 &&
        date.getUTCMonth() === month - 1 && date.getUTCDate() === day &&
        hours < 24 && minutes < 60 && seconds < 60;
}

function literal(value) {
    if (value === null) {
        return 'NULL';
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (value instanceof Uint8Array) {
        return escape(Buffer.from(value));
    }
    return escape(value);
}

/**
 * Approximates MySQL's default utf8mb4 collation, which ignores case and accents.
 * Values SQLite keeps apart can collide in a MySQL unique index.
 */
function collationKey(value) {
    if (typeof value !== 'string') {
        return String(value);
    }
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Writes a MySQL data-only dump of a Ghost SQLite database.
 *
 * The schema is deliberately not dumped: SQLite does not keep the MySQL column
 * sizes, unsigned integers and prefix index lengths that Ghost's schema uses.
 * The destination creates the canonical schema by initialising Ghost at the
 * source's version before loading these rows.
 *
 * Fails, after reading every row, if any value would be rejected by MySQL:
 * strings longer than their declared varchar length, or unique keys that only
 * differ by case or accents.
 *
 * @param {string} sqliteFile
 * @param {string} outputFile Must already exist; it is overwritten
 * @return {Promise<{[table: string]: number}>} Row counts per table
 */
async function dumpSqliteData(sqliteFile, outputFile) {
    const db = openDatabase(sqliteFile);
    const output = fs.createWriteStream(outputFile, {flags: 'r+'});
    const failed = new Promise((resolve, reject) => {
        output.once('error', reject);
    });
    failed.catch(() => {});

    const write = async (chunk) => {
        if (!output.write(chunk)) {
            await Promise.race([once(output, 'drain'), failed]);
        }
    };

    const problems = [];
    let problemCount = 0;
    const problem = (message) => {
        problemCount += 1;
        if (problems.length < MAX_PROBLEMS) {
            problems.push(message);
        }
    };

    const rowCounts = {};

    try {
        await write(HEADER);

        for (const table of introspect(db)) {
            const tableId = escapeId(table.name);
            const columnList = table.columns.map(column => escapeId(column.name)).join(', ');
            const insertPrefix = `INSERT INTO ${tableId} (${columnList}) VALUES\n`;
            const seen = table.uniques.map(() => new Map());

            await write(`\n-- Table ${table.name}\nDELETE FROM ${tableId};\n`);

            // node:sqlite reads text as a C string, cutting it at the first NUL
            // character, so text is read as bytes and decoded here instead.
            // SQLite also accepts MySQL-style backtick quoting.
            const selectList = table.columns.map((column, i) => {
                const id = escapeId(column.name);
                return `typeof(${id}) AS t${i}, CASE typeof(${id}) WHEN 'text' THEN CAST(${id} AS BLOB) ELSE ${id} END AS v${i}`;
            }).join(', ');
            const statement = db.prepare(`SELECT ${selectList} FROM ${tableId}`);
            // Ghost's bigint columns can exceed Number.MAX_SAFE_INTEGER
            statement.setReadBigInts(true);

            let count = 0;
            let batch = [];
            let batchBytes = 0;

            const flush = async () => {
                if (batch.length) {
                    await write(`${insertPrefix}${batch.join(',\n')};\n`);
                    batch = [];
                    batchBytes = 0;
                }
            };

            for (const raw of statement.iterate()) {
                count += 1;
                const row = {};
                let invalidText = null;
                table.columns.forEach((column, i) => {
                    let value = raw[`v${i}`];
                    if (raw[`t${i}`] === 'text') {
                        try {
                            value = utf8.decode(value);
                        } catch {
                            invalidText = column.name;
                            value = '';
                        }
                    }
                    row[column.name] = value;
                });
                const rowId = row.id !== undefined ? `id ${row.id}` : `row ${count}`;
                if (invalidText) {
                    problem(`${table.name}.${invalidText} (${rowId}) is not valid UTF-8`);
                }

                if (table.name === 'migrations_lock') {
                    // The destination must be free to run its own migrations later
                    row.locked = 0;
                }

                const values = table.columns.map((column) => {
                    const value = normalise(row[column.name], column);
                    if (column.type === 'datetime' && value !== null && !isMysqlDatetime(value)) {
                        problem(`${table.name}.${column.name} (${rowId}) is not a date MySQL accepts: ${row[column.name]}`);
                    }
                    if (column.maxLength && typeof value === 'string' && value.length > column.maxLength) {
                        const length = [...value].length;
                        if (length > column.maxLength) {
                            problem(`${table.name}.${column.name} (${rowId}) is ${length} characters; MySQL allows ${column.maxLength}`);
                        }
                    }
                    return literal(value);
                });

                table.uniques.forEach((index, i) => {
                    const key = index.columns.map(name => row[name]);
                    if (key.some(part => part === null)) {
                        return;
                    }
                    const normalised = JSON.stringify(key.map(collationKey));
                    const existing = seen[i].get(normalised);
                    if (existing) {
                        problem(`${table.name} ${index.columns.join(', ')}: ${rowId} collides with ${existing} in MySQL's case- and accent-insensitive unique index ${index.name}`);
                    } else {
                        seen[i].set(normalised, rowId);
                    }
                });

                const tuple = `(${values.join(', ')})`;
                if (batch.length && (batch.length >= MAX_STATEMENT_ROWS || batchBytes + tuple.length > MAX_STATEMENT_BYTES)) {
                    await flush();
                }
                batch.push(tuple);
                batchBytes += tuple.length;
            }

            await flush();
            rowCounts[table.name] = count;
        }

        await write(FOOTER);
    } finally {
        db.close();
        output.end();
        await Promise.race([once(output, 'close'), failed]);
    }

    if (problemCount) {
        const more = problemCount > problems.length ? `\n  ...and ${problemCount - problems.length} more` : '';
        throw new SystemError(`The SQLite database contains values MySQL would reject. Fix them in the source site, then export again:\n  ${problems.join('\n  ')}${more}`);
    }

    return rowCounts;
}

module.exports = {databaseFile, dumpSqliteData, introspect, collationKey};
