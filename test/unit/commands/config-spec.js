'use strict';
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const Config = require('../../../lib/utils/config');
const errors = require('../../../lib/errors');

const modulePath = '../../../lib/commands/config';

function fake(overrides = {}) {
    return proxyquire('../../../lib/commands/config', overrides);
}

describe('Unit: Command > Config', function () {
    it('configureSubcommands works', function () {
        const yargsStub = {};
        yargsStub.command = sinon.stub().returns(yargsStub);
        const extensions = [{extensionA: true}];

        const ConfigCommand = require(modulePath);
        const runStub = sinon.stub(ConfigCommand, '_run');
        ConfigCommand.configureSubcommands('config', yargsStub, extensions);

        expect(yargsStub.command.calledTwice).to.be.true;

        const command1 = yargsStub.command.args[0][0];
        expect(command1.command).to.equal('get <key>');
        expect(command1.handler).to.be.a('function');
        command1.handler({args: true});
        expect(runStub.calledOnce).to.be.true;
        expect(runStub.calledWithExactly('config get', {args: true}, extensions)).to.be.true;

        runStub.reset();

        const command2 = yargsStub.command.args[1][0];
        expect(command2.command).to.equal('set <key> <value>');
        expect(command2.handler).to.be.a('function');
        command2.handler({args: true});
        expect(runStub.calledOnce).to.be.true;
        expect(runStub.calledWithExactly('config set', {args: true}, extensions)).to.be.true;
    });

    it('constructs instance', function () {
        const instanceStub = sinon.stub().returns({instance: true});
        const ConfigCommand = require(modulePath);

        const config = new ConfigCommand({}, {getInstance: instanceStub});

        expect(instanceStub.calledOnce).to.be.true;
        expect(config.instance).to.deep.equal({instance: true});
    });

    describe('run', function () {
        it('outputs key if key defined and value is not', async function () {
            const ConfigCommand = fake();
            const log = sinon.stub();
            const checkEnvironment = sinon.stub();
            const config = new Config('config.json');
            const getInstance = sinon.stub().returns({checkEnvironment, config});
            config.set('url', 'http://localhost:2368');

            const cmd = new ConfigCommand({log}, {getInstance});

            await cmd.run({key: 'url'});
            expect(checkEnvironment.calledOnce).to.be.true;
            expect(log.calledOnce).to.be.true;
            expect(log.args[0][0]).to.equal('http://localhost:2368');

            await cmd.run({key: 'nope'});
            expect(checkEnvironment.calledTwice).to.be.true;
            expect(log.calledOnce).to.be.true;
        });

        it('sets value if both key and value defined', async function () {
            const ConfigCommand = fake();
            const checkEnvironment = sinon.stub();
            const config = new Config('config.json');
            const getInstance = sinon.stub().returns({checkEnvironment, config});
            const setStub = sinon.stub(config, 'set').returns(config);
            const saveStub = sinon.stub(config, 'save');
            const log = sinon.stub();

            const cmd = new ConfigCommand({log}, {getInstance});

            await cmd.run({key: 'url', value: 'http://localhost:2368'});
            expect(checkEnvironment.calledOnce).to.be.true;
            expect(setStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
            expect(setStub.args[0]).to.deep.equal(['url', 'http://localhost:2368']);
            expect(log.calledOnce).to.be.true;
        });

        it('transforms value before setting it', async function () {
            const ConfigCommand = fake();
            const checkEnvironment = sinon.stub();
            const config = new Config('config.json');
            const getInstance = sinon.stub().returns({checkEnvironment, config});
            const setStub = sinon.stub(config, 'set').returns(config);
            const saveStub = sinon.stub(config, 'save');
            const log = sinon.stub();

            const cmd = new ConfigCommand({log}, {getInstance});

            await cmd.run({key: 'url', value: 'LoveGhost.com'});
            expect(setStub.args[0]).to.deep.equal(['url', 'https://loveghost.com']);
            expect(saveStub.calledOnce).to.be.true;
            expect(log.args[0][0]).to.contain('https://loveghost.com');
        });

        it('validates value before setting it', async function () {
            const ConfigCommand = fake();
            const checkEnvironment = sinon.stub();
            const config = new Config('config.json');
            const getInstance = sinon.stub().returns({checkEnvironment, config});
            const setStub = sinon.stub(config, 'set').returns(config);
            const saveStub = sinon.stub(config, 'save');
            const log = sinon.stub();

            const cmd = new ConfigCommand({log}, {getInstance, environment: 'testing'});

            try {
                await cmd.run({key: 'url', value: 'not-a-url'});
                expect.fail('run should have errored');
            } catch (error) {
                expect(error).to.be.an.instanceof(errors.ConfigError);
                expect(error.options.config).to.deep.equal({url: 'https://not-a-url'});
                expect(error.options.environment).to.equal('testing');
            }

            expect(setStub.called).to.be.false;
            expect(saveStub.called).to.be.false;
            expect(log.called).to.be.false;
        });

        it('validates using the option matching the config path', async function () {
            const ConfigCommand = fake();
            const checkEnvironment = sinon.stub();
            const config = new Config('config.json');
            const getInstance = sinon.stub().returns({checkEnvironment, config});
            const setStub = sinon.stub(config, 'set').returns(config);
            const saveStub = sinon.stub(config, 'save');
            const log = sinon.stub();

            const cmd = new ConfigCommand({log}, {getInstance, environment: 'testing'});

            try {
                await cmd.run({key: 'database.client', value: 'postgres'});
                expect.fail('run should have errored');
            } catch (error) {
                expect(error).to.be.an.instanceof(errors.ConfigError);
                expect(error.options.message).to.equal('Invalid database type. Supported types are mysql and sqlite3');
            }

            expect(setStub.called).to.be.false;
            expect(saveStub.called).to.be.false;
        });

        it('doesn\'t validate keys without a matching option', async function () {
            const ConfigCommand = fake();
            const checkEnvironment = sinon.stub();
            const config = new Config('config.json');
            const getInstance = sinon.stub().returns({checkEnvironment, config});
            const setStub = sinon.stub(config, 'set').returns(config);
            const saveStub = sinon.stub(config, 'save');
            const log = sinon.stub();

            const cmd = new ConfigCommand({log}, {getInstance});

            await cmd.run({key: 'paths.contentPath', value: '/var/www/ghost/content'});
            expect(setStub.args[0]).to.deep.equal(['paths.contentPath', '/var/www/ghost/content']);
            expect(saveStub.calledOnce).to.be.true;
        });

        it('calls configure if key and value aren\'t provided', async function () {
            const configureStub = sinon.stub().resolves();
            const ConfigCommand = fake({
                '../tasks/configure': configureStub
            });
            const checkEnvironment = sinon.stub();
            const config = new Config('config.json');
            const getInstance = sinon.stub().returns({checkEnvironment, config});
            const ui = {uiInstance: true};
            const argv = {url: 'http://ghost.test', dbhost: 'localhost', dbuser: 'root', db: 'mysql'};
            const cmd = new ConfigCommand(ui, {getInstance, environment: 'testing'});

            await cmd.run(argv);
            expect(configureStub.calledOnce).to.be.true;
            expect(configureStub.args[0][0]).to.deep.equal(ui);
            expect(configureStub.args[0][1]).to.deep.equal(config);
            expect(configureStub.args[0][2]).to.deep.equal(argv);
            expect(configureStub.args[0][3]).to.equal('testing');
            expect(configureStub.args[0][4]).to.equal(false);
        });
    });
});
