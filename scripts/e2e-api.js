#!/usr/bin/env node
/**
 * Small Admin API helper used by the import/export e2e workflow.
 *
 * Ghost-CLI's import/export commands need a set up blog and a staff access
 * token, neither of which the CLI itself can create. This does the bare
 * minimum over the Admin API so the workflow stays readable.
 *
 * Usage:
 *   node scripts/e2e-api.js setup <url> <email> <password> <blogTitle>
 *   node scripts/e2e-api.js token <url> <email> <password>
 *   node scripts/e2e-api.js create-post <url> <email> <password> <title>
 *   node scripts/e2e-api.js assert-post <exportFile> <title>
 */
const fs = require('fs');

const apiUrl = (url, endpoint) => `${url.replace(/\/?$/, '')}/ghost/api/admin/${endpoint}`;

async function request(url, endpoint, {cookie, ...options} = {}) {
    const headers = {origin: url, ...options.headers};

    if (options.body) {
        headers['content-type'] = 'application/json';
    }

    if (cookie) {
        headers.cookie = cookie;
    }

    const response = await fetch(apiUrl(url, endpoint), {...options, headers});

    if (!response.ok) {
        throw new Error(`${options.method || 'GET'} ${endpoint} failed (${response.status}): ${await response.text()}`);
    }

    return response;
}

async function setup(url, email, password, blogTitle) {
    await request(url, 'authentication/setup/', {
        method: 'POST',
        body: JSON.stringify({setup: [{name: 'E2E Owner', email, password, blogTitle}]})
    });
}

async function login(url, username, password) {
    const response = await request(url, 'session/', {
        method: 'POST',
        body: JSON.stringify({username, password})
    });

    const cookies = response.headers.getSetCookie();

    if (!cookies.length) {
        throw new Error('No session cookie returned. Is staff device verification disabled?');
    }

    return cookies.map(cookie => cookie.split(';')[0]).join('; ');
}

async function token(url, email, password) {
    const cookie = await login(url, email, password);
    const response = await request(url, 'users/me/token/', {cookie});
    const {apiKey} = await response.json();

    // Ghost has serialized this as both a bare object and a single-item array
    const {id, secret} = Array.isArray(apiKey) ? apiKey[0] : apiKey;

    if (!id || !secret) {
        throw new Error('Could not read a staff access token for the owner user');
    }

    return `${id}:${secret}`;
}

async function createPost(url, email, password, title) {
    const cookie = await login(url, email, password);

    await request(url, 'posts/?source=html', {
        method: 'POST',
        cookie,
        body: JSON.stringify({posts: [{title, html: `<p>${title}</p>`, status: 'published'}]})
    });
}

function assertPost(exportFile, title) {
    const content = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    const posts = content.db?.[0]?.data?.posts || content.data?.posts || [];

    if (!posts.some(post => post.title === title)) {
        throw new Error(`Export ${exportFile} does not contain a post titled "${title}" (${posts.length} posts found)`);
    }
}

async function run([command, ...args]) {
    switch (command) {
    case 'setup':
        return setup(...args);
    case 'token':
        return token(...args);
    case 'create-post':
        return createPost(...args);
    case 'assert-post':
        return assertPost(...args);
    default:
        throw new Error(`Unknown command: ${command}`);
    }
}

run(process.argv.slice(2)).then((output) => {
    if (output) {
        process.stdout.write(`${output}\n`);
    }
}).catch((error) => {
    console.error(error.message);
    process.exit(1);
});
