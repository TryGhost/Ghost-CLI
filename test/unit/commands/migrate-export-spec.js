const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const {SystemError} = require('../../../lib/errors');

const modulePath = '../../../lib/commands/migrate-export';

function createUi(overrides = {}) {
    return {
        log: sinon.stub(),
        confirm: sinon.stub().resolves(true),
        run: sinon.stub().callsFake(fn => fn()),
        ...overrides
    };
}

function createInstance(running = true, version = '6.61.0') {
    return {
        name: 'example-com',
        version,
        config: {get: sinon.stub()},
        checkEnvironment: sinon.stub(),
        isRunning: sinon.stub().resolves(running),
        start: sinon.stub().resolves()
    };
}

function load({kind = 'mysql-dump', migrationExport, getInstance, baseCommand} = {}) {
    const stubs = {
        '../tasks/migration-export':
            migrationExport ||
            sinon.stub().resolves({
                path: '/tmp/bundle',
                manifest: {kind},
                secrets: [],
                linkedThemes: []
            }),
        '../tasks/migration-export/database': {databaseKind: () => kind},
        '../utils/get-instance': getInstance || sinon.stub().returns(createInstance())
    };

    if (baseCommand) {
        stubs['../command'] = baseCommand;
    }
    return {Command: proxyquire(modulePath, stubs), stubs};
}

describe('Unit: Commands > migrate-export', function () {
    it('warns about beta and does nothing unless confirmed', async function () {
        const {Command, stubs} = load();
        const ui = createUi({confirm: sinon.stub().resolves(false)});
        const cmd = new Command(ui, {});

        await cmd.run({});

        expect(ui.log.args[0][0]).to.match(/beta/i);
        expect(ui.log.args[0][0]).to.match(/backup/i);
        expect(ui.confirm.calledOnce).to.be.true;
        expect(ui.confirm.args[0][1]).to.be.false;
        expect(stubs['../utils/get-instance'].called).to.be.false;
        expect(stubs['../tasks/migration-export'].called).to.be.false;
    });

    it('still prints the beta notice when --force skips the prompt', async function () {
        const {Command, stubs} = load();
        const ui = createUi({confirm: sinon.stub().resolves(false)});
        const cmd = new Command(ui, {});

        await cmd.run({force: true});

        expect(ui.log.args[0][0]).to.match(/beta/i);
        expect(ui.confirm.called).to.be.false;
        expect(stubs['../tasks/migration-export'].calledOnce).to.be.true;
    });

    it('exports a running mysql instance without starting anything', async function () {
        const instance = createInstance(true);
        const migrationExport = sinon
            .stub()
            .resolves({path: '/tmp/bundle', manifest: {kind: 'mysql-dump'}, secrets: [], linkedThemes: []});
        const {Command} = load({migrationExport, getInstance: sinon.stub().returns(instance)});
        const ui = createUi();
        const cmd = new Command(ui, {});

        await cmd.run({output: '/tmp/bundle', archive: 'tgz', force: true});

        expect(instance.checkEnvironment.calledOnce).to.be.true;
        expect(instance.start.called).to.be.false;
        expect(migrationExport.calledOnce).to.be.true;
        expect(migrationExport.args[0][0]).to.equal(ui);
        expect(migrationExport.args[0][1]).to.equal(instance);
        expect(migrationExport.args[0][2]).to.deep.equal({
            output: '/tmp/bundle',
            archive: 'tgz',
            leaveStopped: undefined,
            sqliteFormat: undefined,
            cwd: process.cwd()
        });
        expect(ui.log.args.pop()[0]).to.include('/tmp/bundle');
    });

    it('takes an instance name from the registry', async function () {
        const getInstance = sinon.stub().returns(createInstance());
        const {Command} = load({getInstance});
        const system = {};
        const cmd = new Command(createUi(), system);

        await cmd.run({name: 'other-site', force: true});

        expect(getInstance.calledOnce).to.be.true;
        expect(getInstance.args[0][0]).to.deep.equal({
            name: 'other-site',
            system,
            command: 'migrate-export',
            recurse: true
        });
    });

    it('does not start a stopped instance for a mysql-dump export', async function () {
        const instance = createInstance(false);
        const {Command} = load({getInstance: sinon.stub().returns(instance)});
        const ui = createUi();
        const cmd = new Command(ui, {});

        await cmd.run({force: true});

        expect(ui.confirm.called).to.be.false;
        expect(instance.start.called).to.be.false;
    });

    it('refuses to export a Ghost 5.x instance', async function () {
        const instance = createInstance(true, '5.87.1');
        const migrationExport = sinon.stub().resolves();
        const {Command} = load({migrationExport, getInstance: sinon.stub().returns(instance)});
        const cmd = new Command(createUi(), {});

        try {
            await cmd.run({force: true});
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('requires Ghost 6.61.0');
            expect(error.message).to.include('5.87.1');
            expect(migrationExport.called).to.be.false;
            return;
        }

        expect.fail('run should have errored');
    });

    it('refuses to export an instance with an unknown version', async function () {
        const instance = createInstance(true, null);
        const migrationExport = sinon.stub().resolves();
        const {Command} = load({migrationExport, getInstance: sinon.stub().returns(instance)});
        const cmd = new Command(createUi(), {});

        try {
            await cmd.run({force: true});
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('unknown version');
            expect(migrationExport.called).to.be.false;
            return;
        }

        expect.fail('run should have errored');
    });

    it('refuses to export a Ghost 6.x instance older than 6.61.0', async function () {
        const instance = createInstance(true, '6.60.9');
        const migrationExport = sinon.stub().resolves();
        const {Command} = load({migrationExport, getInstance: sinon.stub().returns(instance)});
        const cmd = new Command(createUi(), {});

        try {
            await cmd.run({force: true});
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('requires Ghost 6.61.0');
            expect(error.message).to.include('6.60.9');
            expect(error.options.help).to.include('ghost update');
            expect(instance.isRunning.called).to.be.false;
            expect(migrationExport.called).to.be.false;
            return;
        }

        expect.fail('run should have errored');
    });

    it('refuses to export a Ghost 7.x instance', async function () {
        const instance = createInstance(true, '7.0.0');
        const migrationExport = sinon.stub().resolves();
        const {Command} = load({migrationExport, getInstance: sinon.stub().returns(instance)});
        const cmd = new Command(createUi(), {});

        try {
            await cmd.run({force: true});
        } catch (error) {
            expect(error).to.be.an.instanceof(SystemError);
            expect(error.message).to.include('7.0.0');
            expect(migrationExport.called).to.be.false;
            return;
        }

        expect.fail('run should have errored');
    });

    it('exports a Ghost 6.61.0 instance', async function () {
        const instance = createInstance(true, '6.61.0');
        const migrationExport = sinon
            .stub()
            .resolves({path: '/tmp/bundle', manifest: {kind: 'mysql-dump'}, secrets: [], linkedThemes: []});
        const {Command} = load({migrationExport, getInstance: sinon.stub().returns(instance)});
        const cmd = new Command(createUi(), {});

        await cmd.run({force: true});

        expect(migrationExport.calledOnce).to.be.true;
    });

    it('exports a Ghost 6.x prerelease after 6.61.0', async function () {
        const instance = createInstance(true, '6.62.0-rc.1');
        const migrationExport = sinon
            .stub()
            .resolves({path: '/tmp/bundle', manifest: {kind: 'mysql-dump'}, secrets: [], linkedThemes: []});
        const {Command} = load({migrationExport, getInstance: sinon.stub().returns(instance)});
        const cmd = new Command(createUi(), {});

        await cmd.run({force: true});

        expect(migrationExport.calledOnce).to.be.true;
    });

    it('warns when the bundle config holds secrets', async function () {
        const migrationExport = sinon.stub().resolves({
            path: '/tmp/bundle',
            manifest: {kind: 'mysql-dump'},
            secrets: ['mail__options__auth__pass'],
            linkedThemes: []
        });
        const {Command} = load({migrationExport});
        const ui = createUi();
        const cmd = new Command(ui, {});

        await cmd.run({force: true});

        const messages = ui.log.args.map(([message]) => message);
        expect(messages.some(message => message.includes('mail__options__auth__pass'))).to.be.true;
    });
    it('warns once for each linked theme', async function () {
        const migrationExport = sinon.stub().resolves({
            path: '/tmp/bundle',
            manifest: {kind: 'mysql-dump'},
            secrets: [],
            linkedThemes: [{name: 'my-theme', source: '/home/dev/my-theme'}]
        });
        const {Command} = load({migrationExport});
        const ui = createUi();
        const cmd = new Command(ui, {});

        await cmd.run({force: true});

        const warnings = ui.log.args.map(([message]) => message).filter(message => message.includes('my-theme'));
        expect(warnings).to.have.length(1);
        expect(warnings[0]).to.include('/home/dev/my-theme');
        expect(warnings[0]).to.include('compose.override.yml');
    });
    describe('docker next steps', function () {
        async function run(manifest, bundlePath = '/tmp/my blog bundle', port = 2369) {
            const instance = createInstance();
            instance.config = {get: sinon.stub().withArgs('server.port').returns(port)};
            const migrationExport = sinon.stub().resolves({path: bundlePath, manifest, secrets: [], linkedThemes: []});
            const {Command} = load({migrationExport, getInstance: sinon.stub().returns(instance)});
            const ui = createUi();
            await new Command(ui, {}).run({force: true});
            return ui.log.args.map(([message]) => message).find(message => message.includes('install --import'));
        }

        it('prints the import command for a local bundle', async function () {
            const message = await run({kind: 'mysql-data', sourceInstallType: 'local'});
            expect(message).to.include('ghost stop');
            expect(message).to.include("install --import '/tmp/my blog bundle' --port 2369");
        });

        it('leaves a plain bundle path unquoted', async function () {
            const message = await run({kind: 'mysql-dump', sourceInstallType: 'local'}, '/tmp/bundle.tgz');
            expect(message).to.include('install --import /tmp/bundle.tgz --port 2369');
        });

        it('skips the command when server.port is not a positive integer', async function () {
            for (const port of ['2368; echo hi', '', null]) {
                expect(await run({kind: 'mysql-data', sourceInstallType: 'local'}, '/tmp/bundle', port)).to.be
                    .undefined;
            }
        });

        it('skips portable and production bundles', async function () {
            expect(await run({kind: 'portable', sourceInstallType: 'local'})).to.be.undefined;
            expect(await run({kind: 'mysql-dump', sourceInstallType: 'production'})).to.be.undefined;
        });
    });

    it('passes the parsed --leave-stopped option to the exporter', async function () {
        const yargs = require('yargs/yargs');
        const {Command, stubs} = load();
        const argv = yargs(['--leave-stopped', '--force']).options(Command.options).parse();
        await new Command(createUi(), {}).run(argv);
        expect(stubs['../tasks/migration-export'].args[0][2].leaveStopped).to.be.true;
    });
    it('passes the parsed --sqlite-format option to the exporter', async function () {
        const yargs = require('yargs/yargs');
        const {Command, stubs} = load();
        const argv = yargs(['--sqlite-format', 'portable', '--force']).options(Command.options).parse();
        await new Command(createUi(), {}).run(argv);
        expect(stubs['../tasks/migration-export'].args[0][2].sqliteFormat).to.equal('portable');
        expect(() =>
            yargs(['--sqlite-format', 'json'])
                .options(Command.options)
                .fail(message => {
                    throw new Error(message);
                })
                .parse()
        ).to.throw(/Invalid values/);
    });
    for (const output of [undefined, 'bundle']) {
        it(`preserves invocation cwd through --dir for ${output || 'default'} output`, async function () {
            const path = require('node:path');
            const caller = path.resolve('/caller');
            const source = path.join(caller, 'source');
            let current = caller;
            const cwd = sinon.stub(process, 'cwd').callsFake(() => current);
            const chdir = sinon.stub(process, 'chdir').callsFake(dir => {
                current = dir;
            });
            const ui = createUi();
            ui.error = error => {
                throw error;
            };
            const system = {setEnvironment: sinon.stub(), loadOsInfo: sinon.stub().resolves()};
            const baseCommand = proxyquire('../../../lib/command', {
                './ui': sinon.stub().returns(ui),
                './system': sinon.stub().returns(system)
            });
            const getInstance = sinon.stub().callsFake(() => {
                expect(process.cwd()).to.equal(source);
                return createInstance();
            });
            const {Command, stubs} = load({baseCommand, getInstance});
            Command.skipDeprecationCheck = true;
            try {
                await Command._run('migrate-export', {dir: 'source', output, force: true, allowRoot: true}, []);
                expect(chdir.calledOnceWithExactly(source)).to.be.true;
                expect(stubs['../tasks/migration-export'].args[0][2]).to.include({cwd: caller, output});
            } finally {
                cwd.restore();
                chdir.restore();
            }
        });
    }
});
