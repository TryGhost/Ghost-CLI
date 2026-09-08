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
        log: sinon.stub()
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
            ghostVersion: '6.2.0',
            sourceEnvironment: 'production',
            url: 'https://example.com',
            adminUrl: 'https://admin.example.com',
            database: {kind: 'mysql-dump', path: 'database.sql'},
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
        expect(manifest.database.kind).to.equal('portable');
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
        const instance = createInstance('/does/not/exist');
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
        expect(commands.some(command => command.startsWith('cp -R') && command.includes('content/images'))).to.be.true;
        expect(commands.some(command => command.startsWith('chown -R'))).to.be.true;
    });

    it('zips the bundle when asked for --archive zip', async function () {
        const source = createSource();
        const output = path.join(setupTestFolder().dir, 'bundle');
        const compress = sinon.stub().callsFake((dir, zipPath) => fs.promises.writeFile(zipPath, 'zip'));
        const migrationExport = load({'@tryghost/zip': {compress}});

        const ui = createUi();
        const result = await migrationExport(ui, createInstance(source.dir), {output, archive: 'zip'});

        expect(result.path).to.equal(`${output}.zip`);
        expect(compress.calledOnceWithExactly(output, `${output}.zip`)).to.be.true;
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
});
