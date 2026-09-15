const fs = require('node:fs');
const path = require('path');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const {setupTestFolder, cleanupTestFolders} = require('../../../utils/test-folder');

const modulePath = '../../../../lib/tasks/migration-export';

// Stands in for ui.listr: runs the tasks in order, honouring `enabled`/`skip`
async function runTasks(tasks, context = {}) {
    for (const task of tasks) {
        if (task.enabled && !await task.enabled(context)) {
            continue;
        }

        if (task.skip && await task.skip(context)) {
            continue;
        }

        await task.task(context);
    }

    return context;
}

function createUi() {
    return {
        run: sinon.stub().callsFake(fn => fn()),
        listr: sinon.stub().callsFake(runTasks),
        sudo: sinon.stub().resolves(),
        log: sinon.stub(),
        confirm: sinon.stub().resolves(true)
    };
}

function createInstance(dir, {client = 'mysql', running = false} = {}) {
    const values = {
        url: 'https://example.com',
        admin: {url: 'https://admin.example.com'},
        database: {client, connection: {database: 'ghost_prod', password: 'hunter2'}},
        server: {port: 2368},
        mail: {transport: 'SMTP', options: {host: 'smtp.example.com'}}
    };

    return {
        dir,
        isLocal: client === 'sqlite3',
        name: 'example-com',
        version: '6.2.0',
        system: {environment: 'production'},
        config: {
            values,
            get: (key, defaultValue) => {
                const value = key.split('.').reduce((acc, part) => (acc === undefined || acc === null ? acc : acc[part]), values);
                return value === undefined ? defaultValue : value;
            }
        },
        isRunning: sinon.stub().resolves(running),
        start: sinon.stub().resolves(),
        stop: sinon.stub().resolves()
    };
}

// A minimal Ghost content directory
function createSource() {
    return setupTestFolder({
        dirs: ['content/images/2024/01', 'content/settings', 'content/themes/casper', 'content/data', 'content/logs'],
        files: [
            {path: 'content/images/2024/01/photo.jpg', content: 'jpeg'},
            {path: 'content/settings/routes.yaml', content: 'routes: {}'},
            {path: 'content/themes/casper/package.json', content: '{}'},
            {path: 'content/data/redirects.yaml', content: '302: {}'},
            {path: 'content/data/ghost-local.db', content: 'sqlite'},
            {path: 'content/logs/ghost.log', content: 'noisy'}
        ]
    });
}

function load(stubs = {}) {
    return proxyquire(modulePath, {
        '../import': {exportTask: sinon.stub().resolves()},
        './database': {databaseKind: () => 'mysql-dump', dumpDatabase: sinon.stub().resolves()},
        '../../utils/use-ghost-user': {shouldUseGhostUser: () => false},
        ...stubs
    });
}

describe('Unit: Tasks > migration-export', function () {
    afterAll(() => {
        cleanupTestFolders();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('exports a mysql install as a mysql-dump bundle', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const dumpDatabase = sinon.stub().callsFake((instance, file) => fs.promises.writeFile(file, '-- dump'));
        const exportTask = sinon.stub().resolves();

        const migrationExport = load({
            '../import': {exportTask},
            './database': {databaseKind: () => 'mysql-dump', dumpDatabase}
        });

        const ui = createUi();
        const instance = createInstance(source.dir, {running: true});
        const result = await migrationExport(ui, instance, {output});

        expect(result.path).to.equal(output);
        expect(exportTask.called).to.be.false;
        expect(dumpDatabase.calledOnce).to.be.true;
        expect(dumpDatabase.args[0][1]).to.equal(path.join(output, 'database.sql'));

        // Stopped for the export, then put back the way we found it
        expect(instance.stop.calledOnce).to.be.true;
        expect(instance.start.calledOnce).to.be.true;

        expect(fs.existsSync(path.join(output, 'database.sql'))).to.be.true;
        expect(fs.existsSync(path.join(output, 'content/images/2024/01/photo.jpg'))).to.be.true;
        expect(fs.existsSync(path.join(output, 'content/settings/routes.yaml'))).to.be.true;
        expect(fs.existsSync(path.join(output, 'content/themes/casper/package.json'))).to.be.true;
        expect(fs.existsSync(path.join(output, 'content/data/redirects.yaml'))).to.be.true;

        // Neither the SQLite database nor the logs travel
        expect(fs.existsSync(path.join(output, 'content/data/ghost-local.db'))).to.be.false;
        expect(fs.existsSync(path.join(output, 'content/logs'))).to.be.false;

        const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
        expect(manifest).to.deep.equal({
            bundleVersion: 1,
            bundleCreatedAt: manifest.bundleCreatedAt,
            sourceInstallType: 'production',
            kind: 'mysql-dump',
            ghost: {version: '6.2.0'},
            url: 'https://example.com',
            adminUrl: 'https://admin.example.com',
            database: {path: 'database.sql'},
            content: 'content/',
            config: {
                admin__url: 'https://admin.example.com',
                mail__transport: 'SMTP',
                mail__options__host: 'smtp.example.com'
            }
        });
        expect(result.manifest).to.deep.equal(manifest);
        expect(result.secrets).to.deep.equal([]);
    });

    it('exports a sqlite install as a portable bundle', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const dumpDatabase = sinon.stub().resolves();
        const exportTask = sinon.stub().callsFake((ui, instance, contentFile, membersFile) => Promise.all([
            fs.promises.writeFile(contentFile, '{}'),
            fs.promises.writeFile(membersFile, 'email\n')
        ]));

        const migrationExport = load({
            '../import': {exportTask},
            './database': {databaseKind: () => 'portable', dumpDatabase}
        });

        const ui = createUi();
        const instance = createInstance(source.dir, {client: 'sqlite3', running: true});
        const result = await migrationExport(ui, instance, {output});

        expect(dumpDatabase.called).to.be.false;
        expect(exportTask.calledOnce).to.be.true;

        // The API export has to run before Ghost is stopped
        expect(exportTask.calledBefore(instance.stop)).to.be.true;

        const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
        expect(manifest.kind).to.equal('portable');
        expect(manifest.database.path).to.match(/^content\/data\/content-from-v6\.2\.0-on-[\d-]+\.json$/);
        expect(manifest.database.members).to.match(/^content\/data\/members-from-v6\.2\.0-on-[\d-]+\.csv$/);
        expect(fs.existsSync(path.join(output, manifest.database.path))).to.be.true;
        expect(fs.existsSync(path.join(output, manifest.database.members))).to.be.true;
        expect(result.manifest.database).to.deep.equal(manifest.database);
    });

    it('leaves a stopped instance stopped', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const migrationExport = load();

        const ui = createUi();
        const instance = createInstance(source.dir, {running: false});
        await migrationExport(ui, instance, {output});

        expect(instance.stop.called).to.be.false;
        expect(instance.start.called).to.be.false;
    });

    it('runs the export as a single listr task list', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const migrationExport = load();

        const ui = createUi();
        await migrationExport(ui, createInstance(source.dir, {running: true}), {output});

        expect(ui.listr.calledOnce).to.be.true;
        const titles = ui.listr.args[0][0].map(({title}) => title);
        expect(titles).to.deep.equal([
            'Exporting content',
            'Stopping Ghost',
            'Copying content files',
            'Dumping database',
            'Restarting Ghost',
            'Writing manifest',
            'Compressing bundle'
        ]);
    });

    it('restarts the instance if the export fails', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const dumpDatabase = sinon.stub().rejects(new Error('nope'));
        const migrationExport = load({'./database': {databaseKind: () => 'mysql-dump', dumpDatabase}});

        const ui = createUi();
        const instance = createInstance(source.dir, {running: true});

        try {
            await migrationExport(ui, instance, {output});
        } catch (error) {
            expect(error.message).to.equal('nope');
            expect(instance.stop.calledOnce).to.be.true;
            expect(instance.start.calledOnce).to.be.true;
            return;
        }

        expect.fail('migrationExport should have errored');
    });

    it('omits adminUrl when there isn\'t a separate admin domain, and flags secrets', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const migrationExport = load();

        const ui = createUi();
        const instance = createInstance(source.dir);
        delete instance.config.values.admin;
        instance.config.values.mail.options.auth = {user: 'ghost', pass: 'hunter2'};

        const result = await migrationExport(ui, instance, {output});

        const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
        expect('adminUrl' in manifest).to.be.false;
        expect(result.secrets).to.deep.equal(['mail__options__auth__pass']);
    });

    it('reads the content dir from paths.contentPath when it is set', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const migrationExport = load();

        const ui = createUi();
        const instance = createInstance(setupTestFolder().dir);
        instance.config.values.paths = {contentPath: path.join(source.dir, 'content')};

        await migrationExport(ui, instance, {output});

        expect(fs.existsSync(path.join(output, 'content/images/2024/01/photo.jpg'))).to.be.true;
    });

    it('copies via sudo when the content dir belongs to the ghost user', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const migrationExport = load({'../../utils/use-ghost-user': {shouldUseGhostUser: () => true}});

        const ui = createUi();
        await migrationExport(ui, createInstance(source.dir), {output});

        const commands = ui.sudo.args.map(([command]) => command);
        expect(commands.some(command => command.startsWith('cp ') && command.includes('content/images'))).to.be.true;
        expect(commands.some(command => command.startsWith('chown '))).to.be.true;
    });

    it('zips the bundle when asked for --archive zip', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const compress = sinon.stub().callsFake((dir, zipPath) => fs.promises.writeFile(zipPath, 'zip'));
        const migrationExport = load({'@tryghost/zip': {compress}});

        const ui = createUi();
        const result = await migrationExport(ui, createInstance(source.dir), {output, archive: 'zip'});

        expect(result.path).to.equal(`${output}.zip`);
        expect(compress.calledOnceWithExactly(output, `${output}.zip`, {ignore: []})).to.be.true;
        expect(fs.existsSync(`${output}.zip`)).to.be.true;
        expect(fs.existsSync(output)).to.be.false;
    });

    it('tars the bundle when asked for --archive tgz', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const c = sinon.stub().callsFake(options => fs.promises.writeFile(options.file, 'tgz'));
        const migrationExport = load({tar: {c}});

        const ui = createUi();
        const result = await migrationExport(ui, createInstance(source.dir), {output, archive: 'tgz'});

        expect(result.path).to.equal(`${output}.tgz`);
        expect(c.calledOnce).to.be.true;

        const [options, entries] = c.args[0];
        expect(options.file).to.equal(`${output}.tgz`);
        expect(options.cwd).to.equal(output);
        expect(options.gzip).to.be.true;
        // Keeps the source host's uid/gid/username out of the archive
        expect(options.portable).to.be.true;
        expect(entries).to.deep.equal(['.']);

        expect(fs.existsSync(`${output}.tgz`)).to.be.true;
        expect(fs.existsSync(output)).to.be.false;
    });

    it('defaults the output path to a named folder in the cwd', async function () {
        const source = createSource();
        const cwd = setupTestFolder().dir;
        sinon.stub(process, 'cwd').returns(cwd);

        const migrationExport = load();
        const result = await migrationExport(createUi(), createInstance(source.dir), {});

        expect(path.dirname(result.path)).to.equal(cwd);
        expect(path.basename(result.path)).to.match(/^ghost-migration-example-com-[\d-]+$/);
    });

    it('resolves a relative output path against the caller\'s cwd', async function () {
        const source = createSource();
        const cwd = setupTestFolder().dir;
        sinon.stub(process, 'cwd').returns(source.dir);

        const migrationExport = load();
        const result = await migrationExport(createUi(), createInstance(source.dir), {output: 'bundle', cwd});

        expect(result.path).to.equal(path.join(cwd, 'bundle'));
    });
    it('creates and extracts a real tgz with system tar, retaining hidden assets and private modes', async function () {
        const {execFileSync} = require('node:child_process');
        const source = createSource();
        fs.writeFileSync(path.join(source.dir, 'content/themes/casper/.hidden'), 'secret');
        const output = path.join(setupTestFolder().dir, 'bundle space \' $;name');
        const result = await load()(createUi(), createInstance(source.dir), {output, archive: 'tgz'});
        expect(fs.statSync(result.path).mode & 0o777).to.equal(0o600);
        const extracted = setupTestFolder().dir;
        execFileSync('tar', ['-xzf', result.path, '-C', extracted]);
        expect(fs.readFileSync(path.join(extracted, 'content/themes/casper/.hidden'), 'utf8')).to.equal('secret');
        for (const file of ['manifest.json', 'database.sql', 'content/themes/casper/.hidden']) {
            expect(fs.statSync(path.join(extracted, file)).mode & 0o777).to.equal(0o600);
        }
        expect(JSON.parse(fs.readFileSync(path.join(extracted, 'manifest.json'))).kind).to.equal('mysql-dump');
    });

    for (const running of [true, false]) {
        for (const leaveStopped of [true, false]) {
            for (const fails of [true, false]) {
                it(`restores portable state: running=${running}, leaveStopped=${leaveStopped}, fails=${fails}`, async function () {
                    const source = createSource();
                    const output = path.join(setupTestFolder().dir, 'bundle');
                    const instance = createInstance(source.dir, {client: 'sqlite3', running});
                    const exportTask = sinon.stub().callsFake(async (ui, inst, content, members) => {
                        expect(fs.statSync(content).mode & 0o777).to.equal(0o600);
                        expect(fs.statSync(members).mode & 0o777).to.equal(0o600);
                        if (fails) {
                            throw new Error('API failed');
                        }
                        fs.writeFileSync(content, '{}');
                        fs.writeFileSync(members, 'email\n');
                    });
                    const migrationExport = load({
                        '../import': {exportTask},
                        './database': {databaseKind: () => 'portable'}
                    });
                    const promise = migrationExport(createUi(), instance, {output, leaveStopped});
                    if (fails) {
                        await expect(promise).rejects.toThrow('API failed');
                        expect(fs.existsSync(output)).to.be.false;
                    } else {
                        const {manifest} = await promise;
                        expect(manifest.sourceInstallType).to.equal('local');
                        expect(manifest.ghost).to.deep.equal({version: '6.2.0'});
                        expect(manifest.bundleCreatedAt).to.match(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
                    }
                    expect(instance.start.callCount).to.equal(running ? (leaveStopped || fails ? 0 : 1) : 1);
                    expect(instance.stop.callCount).to.equal(fails && running && !leaveStopped ? 0 : 1);
                });
            }
        }
    }

    it('cleans private partial archives and restores running MySQL after compression failure', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const instance = createInstance(source.dir, {running: true});
        const c = sinon.stub().callsFake(async (options) => {
            expect(fs.statSync(options.file).mode & 0o777).to.equal(0o600);
            fs.writeFileSync(options.file, 'partial secret');
            throw new Error('compression failed');
        });
        await expect(load({tar: {c}})(createUi(), instance, {output, archive: 'tgz'})).rejects.toThrow();
        expect(fs.existsSync(output)).to.be.false;
        expect(fs.existsSync(`${output}.tgz`)).to.be.false;
        expect(instance.start.calledOnce).to.be.true;
    });

    it('never restarts a final MySQL export after a dump failure', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const instance = createInstance(source.dir, {running: true});
        const migrationExport = load({'./database': {databaseKind: () => 'mysql-dump', dumpDatabase: sinon.stub().rejects(new Error('dump failed'))}});
        await expect(migrationExport(createUi(), instance, {output, leaveStopped: true})).rejects.toThrow('dump failed');
        expect(instance.stop.calledOnce).to.be.true;
        expect(instance.start.called).to.be.false;
        expect(fs.existsSync(output)).to.be.false;
    });

    it('refuses existing destinations, archive collisions, source overlap and symlink aliases before touching Ghost', async function () {
        const source = createSource();
        const parent = setupTestFolder().dir;
        const existing = path.join(parent, 'existing');
        fs.mkdirSync(existing);
        fs.writeFileSync(path.join(existing, 'sentinel'), 'keep');
        const archive = path.join(parent, 'collision');
        fs.writeFileSync(`${archive}.tgz`, 'keep archive');
        const alias = path.join(parent, 'alias');
        fs.symlinkSync(source.dir, alias);
        for (const [output, format] of [[existing], [archive, 'tgz'], [source.dir], [path.join(source.dir, 'bundle')], [path.join(alias, 'bundle')]]) {
            const instance = createInstance(source.dir, {running: true});
            await expect(load()(createUi(), instance, {output, archive: format})).rejects.toThrow();
            expect(instance.start.called).to.be.false;
            expect(instance.stop.called).to.be.false;
        }
        expect(fs.readFileSync(path.join(existing, 'sentinel'), 'utf8')).to.equal('keep');
        expect(fs.readFileSync(`${archive}.tgz`, 'utf8')).to.equal('keep archive');
        expect(fs.existsSync(archive)).to.be.false;
    });

    it('uses literal shell arguments for sudo copies with spaces and metacharacters', async function () {
        const {execFileSync} = require('node:child_process');
        const source = createSource();
        const name = 'hidden \' $(touch INJECTED); $file';
        fs.writeFileSync(path.join(source.dir, 'content/images', name), 'literal');
        const output = path.join(setupTestFolder().dir, 'bundle');
        const ui = createUi();
        // Execute the exact shell commands as this user, without needing sudo.
        ui.sudo.callsFake(command => execFileSync('/bin/sh', ['-c', command]));
        const migrationExport = load({'../../utils/use-ghost-user': {shouldUseGhostUser: () => true}});
        await migrationExport(ui, createInstance(source.dir), {output});
        expect(fs.readFileSync(path.join(output, 'content/images', name), 'utf8')).to.equal('literal');
        expect(fs.statSync(path.join(output, 'content/images', name)).mode & 0o777).to.equal(0o600);
        expect(fs.existsSync('INJECTED')).to.be.false;
    });

    it('rejects links in content and cleans up after restoring the source', async function () {
        const source = createSource();
        fs.symlinkSync('/etc/passwd', path.join(source.dir, 'content/images/link'));
        const output = path.join(setupTestFolder().dir, 'bundle');
        const instance = createInstance(source.dir, {running: true});
        await expect(load()(createUi(), instance, {output})).rejects.toThrow('Unsupported content link');
        expect(instance.start.calledOnce).to.be.true;
        expect(fs.existsSync(output)).to.be.false;
    });

    it('refuses an incomplete portable members export and restores an originally stopped source', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const instance = createInstance(source.dir, {client: 'sqlite3'});
        const migrationExport = load({
            './database': {databaseKind: () => 'portable'},
            '../import': {exportTask: async (ui, inst, content) => fs.writeFileSync(content, '{}')}
        });
        await expect(migrationExport(createUi(), instance, {output})).rejects.toThrow('Missing or empty portable export');
        expect(instance.start.calledOnce).to.be.true;
        expect(instance.stop.calledOnce).to.be.true;
        expect(fs.existsSync(output)).to.be.false;
    });

    for (const kind of ['mysql-dump', 'portable']) {
        it(`matches the shared ${kind} v1 manifest fixture without draft aliases`, function () {
            sinon.useFakeTimers(new Date('2026-09-14T12:00:00.000Z'));
            const fixture = require(`../../../fixtures/migration-bundle-v1/${kind}.json`);
            const instance = createInstance('/unused', {client: kind === 'portable' ? 'sqlite3' : 'mysql'});
            const manifest = load().buildManifest(instance, {
                kind,
                config: fixture.config,
                contentExportFile: 'content.json',
                membersExportFile: 'members.csv'
            });
            expect(manifest).to.deep.equal(fixture);
        });
    }
    it('runs the existing API exporter and preserves both responses before stopping Ghost', async function () {
        const nock = require('nock');
        const {exportTask} = require('../../../../lib/tasks/import');
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const instance = createInstance(source.dir, {client: 'sqlite3', running: true});
        const content = JSON.stringify({db: [{meta: {version: '6.2.0'}, data: {posts: [{id: 'post1', title: 'Fixture'}], users: [{id: 'author1'}], posts_authors: [{post_id: 'post1', author_id: 'author1'}]}}]});
        const members = 'id,email,name,stripe_customer_id,subscribed_to_emails\nmember1,fixture@example.com,"Name, with comma",cus_fixture,true\n';
        const requests = [];
        const api = nock('https://example.com')
            .get('/ghost/api/admin/authentication/setup/').reply(200, {setup: [{status: true}]})
            .get('/ghost/api/admin/db/').reply(() => {
                requests.push('content');
                expect(instance.stop.called).to.be.false;
                return [200, content];
            })
            .get('/ghost/api/admin/members/upload/?limit=all').reply(() => {
                requests.push('members');
                expect(instance.stop.called).to.be.false;
                return [200, members];
            });
        const ui = createUi();
        ui.prompt = sinon.stub().resolves({token: `${'a'.repeat(24)}:${'b'.repeat(64)}`});
        try {
            const migrationExport = load({'../import': {exportTask}, './database': {databaseKind: () => 'portable'}});
            const {manifest} = await migrationExport(ui, instance, {output});
            expect(fs.readFileSync(path.join(output, manifest.database.path), 'utf8')).to.equal(content);
            expect(fs.readFileSync(path.join(output, manifest.database.members), 'utf8')).to.equal(members);
            expect(requests).to.deep.equal(['content', 'members']);
            expect(api.isDone()).to.be.true;
            expect(instance.stop.calledOnce).to.be.true;
        } finally {
            nock.cleanAll();
        }
    });

    it('reports export and recovery failures together and removes partial output', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const instance = createInstance(source.dir, {running: true});
        instance.start.rejects(new Error('restart failed'));
        const migrationExport = load({'./database': {databaseKind: () => 'mysql-dump', dumpDatabase: sinon.stub().rejects(new Error('dump failed'))}});
        const ui = createUi();
        try {
            await migrationExport(ui, instance, {output});
            expect.fail('expected failure');
        } catch (error) {
            expect(error.errors.map(err => err.message)).to.deep.equal(['dump failed', 'restart failed']);
        }
        expect(ui.log.calledWithMatch(/Check ghost ls/)).to.be.true;
        expect(fs.existsSync(output)).to.be.false;
    });

    it('leaves successful final MySQL exports stopped, whether originally running or stopped', async function () {
        for (const running of [true, false]) {
            const source = createSource();
            const output = path.join(setupTestFolder().dir, 'bundle');
            const instance = createInstance(source.dir, {running});
            await load()(createUi(), instance, {output, leaveStopped: true});
            expect(instance.start.called).to.be.false;
            expect(instance.stop.callCount).to.equal(running ? 1 : 0);
        }
    });
});
