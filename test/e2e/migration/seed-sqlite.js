// Adds rows a mysql-data export has to carry exactly: multi-byte and escaped
// text, NUL characters, long HTML, dates written outside Ghost's model layer and
// integers beyond Number.MAX_SAFE_INTEGER. Run while Ghost is stopped.
//
// Usage: node seed-sqlite.js <ghost.db>
'use strict';
const {DatabaseSync} = require('node:sqlite');

const [file] = process.argv.slice(2);
if (!file) {
    console.error('Usage: node seed-sqlite.js <ghost.db>');
    process.exit(1);
}

const db = new DatabaseSync(file);
const owner = db.prepare('SELECT id FROM users ORDER BY created_at LIMIT 1').get();
const html = `<p>${'Long content '.repeat(8000)}</p>`;

db.exec('BEGIN');
db.prepare(`INSERT INTO posts (id, uuid, title, slug, html, lexical, plaintext, email_recipient_filter, status, type, visibility, created_at, updated_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'all', 'published', 'post', 'public', ?, ?, ?)`).run(
    'aaaaaaaaaaaaaaaaaaaaaaa1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'MySQL data round trip 🚀 "quoted" it\'s \\ back\nslash',
    'mysql-data-round-trip',
    html,
    null,
    'nul\0byte',
    '2026-01-02 03:04:05',
    '2026-01-02T03:04:05.123Z',
    '2026-01-02 03:04:05'
);
db.prepare('INSERT INTO posts_authors (id, post_id, author_id, sort_order) VALUES (?, ?, ?, 0)')
    .run('aaaaaaaaaaaaaaaaaaaaaaa2', 'aaaaaaaaaaaaaaaaaaaaaaa1', owner.id);

const member = db.prepare(`INSERT INTO members (id, uuid, transient_id, email, name, note, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'free', ?)`);
const login = db.prepare('INSERT INTO members_login_events (id, member_id, created_at) VALUES (?, ?, ?)');
[
    ['Zoë 🎉 O\'Brien\\', 'tabs\tand\r\nnewlines', '2026-01-02T03:04:05.000Z'],
    ['Null\0Byte', null, 1767323045000]
].forEach(([name, note, createdAt], i) => {
    const id = `bbbbbbbbbbbbbbbbbbbbbbb${i}`;
    member.run(id, `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${i}`, `transient-${i}`, `member${i}@example.com`, name, note, createdAt);
    login.run(`ccccccccccccccccccccccc${i}`, id, createdAt);
});

db.prepare('INSERT INTO brute (key, firstRequest, lastRequest, lifetime, count) VALUES (?, ?, ?, ?, 1)')
    .run('mysql-data-round-trip', 9007199254740993n, 9007199254740993n, 9007199254740993n);
db.exec('COMMIT');
db.close();
