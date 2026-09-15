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

function createInstance(running = true, version = '6.2.0') {
    return {
        name: 'example-com',
        version,
        checkEnvironment: sinon.stub(),
        isRunning: sinon.stub().resolves(running),
        start: sinon.stub().resolves()
    };
}

function load({kind = 'mysql-dump', migrationExport, getInstance, baseCommand} = {}) {
    const stubs = {
        '../tasks/migration-export': migrationExport || sinon.stub().resolves({
            path: '/tmp/bundle',
            manifest: {kind},
            secrets: []
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
        const migrationExport = sinon.stub().resolves({path: '/tmp/bundle', manifest: {kind: 'mysql-dump'}, secrets: []});
        const {Command} = load({migrationExport, getInstance: sinon.stub().returns(instance)});
        const ui = createUi();
        const cmd = new Command(ui, {});

        await cmd.run({output: '/tmp/bundle', archive: 'tgz', force: true});

        expect(instance.checkEnvironment.calledOnce).to.be.true;
        expect(instance.start.called).to.be.false;
        expect(migrationExport.calledOnce).to.be.true;
        expect(migrationExport.args[0][0]).to.equal(ui);
        expect(migrationExport.args[0][1]).to.equal(instance);
        expect(migrationExport.args[0][2]).to.deep.equal({output: '/tmp/bundle', archive: 'tgz', leaveStopped: undefined, cwd: process.cwd()});
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
            expect(error.message).to.include('only supports Ghost 6.x');
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

    it('exports a Ghost 6.x prerelease', async function () {
        const instance = createInstance(true, '6.0.0-rc.1');
        const migrationExport = sinon.stub().resolves({path: '/tmp/bundle', manifest: {kind: 'mysql-dump'}, secrets: []});
        const {Command} = load({migrationExport, getInstance: sinon.stub().returns(instance)});
        const cmd = new Command(createUi(), {});

        await cmd.run({force: true});

        expect(migrationExport.calledOnce).to.be.true;
    });

    it('warns when the bundle config holds secrets', async function () {
        const migrationExport = sinon.stub().resolves({
            path: '/tmp/bundle',
            manifest: {kind: 'mysql-dump'},
            secrets: ['mail__options__auth__pass']
        });
        const {Command} = load({migrationExport});
        const ui = createUi();
        const cmd = new Command(ui, {});

        await cmd.run({force: true});

        const messages = ui.log.args.map(([message]) => message);
        expect(messages.some(message => message.includes('mail__options__auth__pass'))).to.be.true;
    });
    it('passes the parsed --leave-stopped option to the exporter', async function () {
        const yargs = require('yargs/yargs');
        const {Command, stubs} = load();
        const argv = yargs(['--leave-stopped', '--force']).options(Command.options).parse();
        await new Command(createUi(), {}).run(argv);
        expect(stubs['../tasks/migration-export'].args[0][2].leaveStopped).to.be.true;
    });
    for (const output of [undefined, 'bundle']) {
        it(`preserves invocation cwd through --dir for ${output || 'default'} output`, async function () {
            const path = require('node:path');
            const caller = path.resolve('/caller');
            const source = path.join(caller, 'source');
            let current = caller;
            const cwd = sinon.stub(process, 'cwd').callsFake(() => current);
            const chdir = sinon.stub(process, 'chdir').callsFake((dir) => {
                current = dir;
            });
            const ui = createUi();
            ui.error = (error) => {
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
