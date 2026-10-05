const fs = require('node:fs');
const path = require('path');
const {DatabaseSync} = require('node:sqlite');

const {setupTestFolder, cleanupTestFolders} = require('../../../utils/test-folder');
const {SystemError} = require('../../../../lib/errors');
const {databaseFile, dumpSqliteData, collationKey} = require('../../../../lib/tasks/migration-export/sqlite');

// The table definitions knex writes for Ghost's SQLite schema
const SCHEMA = `
CREATE TABLE \`posts\` (\`id\` varchar(24) not null, \`slug\` varchar(10) not null, \`type\` varchar(50) not null default 'post',
    \`html\` text null, \`featured\` boolean not null default '0', \`created_at\` datetime not null,
    primary key (\`id\`));
CREATE UNIQUE INDEX \`posts_slug_type_unique\` on \`posts\` (\`slug\`, \`type\`);
CREATE TABLE \`members\` (\`id\` varchar(24) not null, \`email\` varchar(191) null, primary key (\`id\`));
CREATE UNIQUE INDEX \`members_email_unique\` on \`members\` (\`email\`);
CREATE TABLE \`brute\` (\`key\` varchar(191) not null, \`lifetime\` bigint not null, primary key (\`key\`));
CREATE TABLE \`migrations_lock\` (\`lock_key\` varchar(191) not null, \`locked\` boolean default '0', primary key (\`lock_key\`));
CREATE TABLE \`migrations\` (\`id\` integer not null primary key autoincrement, \`name\` varchar(120) not null);
CREATE VIEW \`members_view\` AS SELECT id FROM members;
`;

function createDatabase(setup) {
    const {dir} = setupTestFolder();
    const file = path.join(dir, 'ghost.db');
    const db = new DatabaseSync(file);
    db.exec(SCHEMA);
    setup(db);
    db.close();

    const output = path.join(dir, 'database.sql');
    fs.writeFileSync(output, '', {mode: 0o600});
    return {file, output};
}

describe('Unit: Tasks > migration-export > sqlite', function () {
    afterAll(() => {
        cleanupTestFolders();
    });

    it('writes every row as MySQL inserts and counts them', async function () {
        const {file, output} = createDatabase((db) => {
            const post = db.prepare('INSERT INTO posts (id, slug, type, html, featured, created_at) VALUES (?, ?, ?, ?, ?, ?)');
            post.run('p1', 'hello', 'post', 'it\'s "quoted" \\ back\nslash 🎉', 1, '2026-01-02 03:04:05');
            post.run('p2', 'hello', 'page', 'nul\0byte', 0, '2026-01-02 03:04:05');
            db.prepare('INSERT INTO brute (key, lifetime) VALUES (?, ?)').run('k', 9007199254740993n);
            db.prepare('INSERT INTO migrations_lock (lock_key, locked) VALUES (?, ?)').run('km01', 1);
            db.prepare('INSERT INTO migrations (name) VALUES (?)').run('1-create-tables.js');
        });

        const rows = await dumpSqliteData(file, output);
        const sql = fs.readFileSync(output, 'utf8');

        expect(rows).to.deep.equal({brute: 1, members: 0, migrations: 1, migrations_lock: 1, posts: 2});
        expect(sql).to.include('SET SESSION foreign_key_checks = 0;\nSTART TRANSACTION;');
        expect(sql).to.include('SET NAMES utf8mb4;');
        expect(sql).to.match(/COMMIT;\nSET SESSION foreign_key_checks = 1;\n$/);
        expect(sql).to.include('DELETE FROM `members`;');
        expect(sql).not.to.include('members_view');
        expect(sql).not.to.include('sqlite_sequence');
        expect(sql).to.include('INSERT INTO `posts` (`id`, `slug`, `type`, `html`, `featured`, `created_at`) VALUES\n' +
            '(\'p1\', \'hello\', \'post\', \'it\\\'s \\"quoted\\" \\\\ back\\nslash 🎉\', 1, \'2026-01-02 03:04:05\'),\n' +
            '(\'p2\', \'hello\', \'page\', \'nul\\0byte\', 0, \'2026-01-02 03:04:05\');');
        expect(sql).to.include('(\'k\', 9007199254740993)');
        // The destination must be able to run its own migrations
        expect(sql).to.include('INSERT INTO `migrations_lock` (`lock_key`, `locked`) VALUES\n(\'km01\', 0);');
        expect(sql).to.include('INSERT INTO `migrations` (`id`, `name`) VALUES\n(1, \'1-create-tables.js\');');
    });

    it('normalises dates written outside Ghost\'s model layer', async function () {
        const {file, output} = createDatabase((db) => {
            const post = db.prepare('INSERT INTO posts (id, slug, html, created_at) VALUES (?, ?, ?, ?)');
            post.run('p1', 'a', null, 1767323045000);
            post.run('p2', 'b', null, '2026-01-02T03:04:05.123Z');
            post.run('p3', 'c', 'T is fine outside dates', '2026-01-02 03:04:05');
        });

        await dumpSqliteData(file, output);
        const sql = fs.readFileSync(output, 'utf8');
        expect(sql.match(/'2026-01-02 03:04:05'/g)).to.have.length(3);
        expect(sql).to.include('\'T is fine outside dates\'');
        expect(sql).to.include('(\'p1\', \'a\', \'post\', NULL, 0, ');
    });

    it('splits large tables into several inserts', async function () {
        const {file, output} = createDatabase((db) => {
            const member = db.prepare('INSERT INTO members (id, email) VALUES (?, ?)');
            for (let i = 0; i < 2500; i += 1) {
                member.run(`m${i}`, `m${i}@example.com`);
            }
        });

        const rows = await dumpSqliteData(file, output);
        const sql = fs.readFileSync(output, 'utf8');
        expect(rows.members).to.equal(2500);
        expect(sql.match(/INSERT INTO `members`/g)).to.have.length(3);
    });

    it('refuses strings longer than their varchar column', async function () {
        const {file, output} = createDatabase((db) => {
            db.prepare('INSERT INTO posts (id, slug, created_at) VALUES (?, ?, ?)').run('p1', 'eleven-char', '2026-01-02 03:04:05');
            // Ten characters, even though some take several bytes or UTF-16 units
            db.prepare('INSERT INTO posts (id, slug, created_at) VALUES (?, ?, ?)').run('p2', '🎉🎉🎉🎉🎉ééééé', '2026-01-02 03:04:05');
        });

        await expect(dumpSqliteData(file, output)).rejects.toThrow(SystemError);
        await expect(dumpSqliteData(file, output)).rejects.toThrow(/posts\.slug \(id p1\) is 11 characters; MySQL allows 10/);
        await expect(dumpSqliteData(file, output)).rejects.not.toThrow(/id p2/);
    });

    it('refuses unique keys that collide under MySQL\'s collation', async function () {
        const {file, output} = createDatabase((db) => {
            const member = db.prepare('INSERT INTO members (id, email) VALUES (?, ?)');
            member.run('m1', 'Zoe@example.com');
            member.run('m2', 'zoë@example.com');
            // MySQL allows any number of NULLs in a unique index
            member.run('m3', null);
            member.run('m4', null);
            const post = db.prepare('INSERT INTO posts (id, slug, type, created_at) VALUES (?, ?, ?, ?)');
            post.run('p1', 'Hello', 'post', '2026-01-02 03:04:05');
            post.run('p2', 'hello', 'page', '2026-01-02 03:04:05');
        });

        const error = await dumpSqliteData(file, output).catch(err => err);
        expect(error).to.be.instanceOf(SystemError);
        expect(error.message).to.include('members email: id m2 collides with id m1');
        expect(error.message).not.to.include('m4');
        expect(error.message).not.to.include('posts slug');
    });

    it('limits how many problems it reports', async function () {
        const {file, output} = createDatabase((db) => {
            const post = db.prepare('INSERT INTO posts (id, slug, created_at) VALUES (?, ?, ?)');
            for (let i = 0; i < 25; i += 1) {
                post.run(`p${i}`, `much-too-long-${i}`, '2026-01-02 03:04:05');
            }
        });

        await expect(dumpSqliteData(file, output)).rejects.toThrow(/\.\.\.and 5 more/);
    });

    it('approximates MySQL\'s case- and accent-insensitive collation', function () {
        expect(collationKey('Zoë')).to.equal(collationKey('zoe'));
        expect(collationKey('ÉCOLE')).to.equal('ecole');
        expect(collationKey('a')).not.to.equal(collationKey('b'));
        expect(collationKey(1)).to.equal('1');
    });

    describe('databaseFile', function () {
        function instance(dir, filename) {
            return {dir, config: {get: key => (key === 'database.connection.filename' ? filename : undefined)}};
        }

        it('resolves the configured database relative to the install', function () {
            const {dir} = setupTestFolder({files: [{path: 'content/data/ghost-local.db', content: ''}]});
            expect(databaseFile(instance(dir, 'content/data/ghost-local.db'))).to.equal(path.join(dir, 'content/data/ghost-local.db'));
            expect(databaseFile(instance('/elsewhere', path.join(dir, 'content/data/ghost-local.db')))).to.equal(path.join(dir, 'content/data/ghost-local.db'));
        });

        it('refuses a missing database', function () {
            const {dir} = setupTestFolder();
            expect(() => databaseFile(instance(dir))).to.throw(SystemError, /No SQLite database filename/);
            expect(() => databaseFile(instance(dir, 'content/data/missing.db'))).to.throw(SystemError, /SQLite database not found/);
        });
    });
});
