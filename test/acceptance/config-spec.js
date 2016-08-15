/* jshint expr:true */
var expect = require('chai').expect,
    chalk = require('chalk'),
    env = require('../utils/test-env'),
    run = require('../utils/run-cli'),
    fs  = require('fs-extra');

describe('Acceptance: Config', function () {
    var cwd;

    beforeEach(function beforeEach() {
        cwd = env.setup('full');
    });

    afterEach(function afterEach() {
        env.teardown(cwd);
    });

    describe('when used as a setter', function () {
        it('creates file with default environment', function () {
            return run('config test asdf').then(function afterConfig() {
                var contents;
                expect(env.exists('config/config.production.json'), 'production config exists').to.be.true;

                contents = fs.readJsonSync(env.path('config/config.production.json'));
                expect(contents, 'contents of config file').to.be.ok;
                expect(contents.test, 'created config variable').to.equal('asdf');
            });
        });

        it('creates file with specified environment', function () {
            return run('config test asdf --environment development').then(function afterConfig() {
                var contents;
                expect(env.exists('config/config.development.json'), 'development config exists').to.be.true;

                contents = fs.readJsonSync(env.path('config/config.development.json'));
                expect(contents, 'contents of config file').to.be.ok;
                expect(contents.test, 'created config variable').to.equal('asdf');
            });
        });

        it('adds value to existing file', function () {
            fs.writeJsonSync(env.path('config/config.production.json'), {port: 1234});

            return run('config test asdf').then(function afterConfig() {
                var contents;
                expect(env.exists('config/config.production.json'), 'production config exists').to.be.true;

                contents = fs.readJsonSync(env.path('config/config.production.json'));
                expect(contents, 'contents of config file').to.be.ok;
                expect(contents.test, 'created config variable').to.equal('asdf');
                expect(contents.port, 'existing config variable').to.equal(1234);
            });
        });
    });

    describe('when used as a getter', function () {
        it('can get value of existing config file', function () {
            fs.writeJsonSync(env.path('config/config.production.json'), {test: 'asdf'});

            return run('config test').then(function afterConfig(result) {
                expect(result.stdout, 'output exists').to.be.ok;
                expect(chalk.stripColor(result.stdout), 'output value').to.equal('asdf\nFinished!\n');
            });
        });

        it('can get value of existing file with environment option', function () {
            fs.writeJsonSync(env.path('config/config.development.json'), {test: 'asdf'});

            return run('config test -e development').then(function afterConfig(result) {
                expect(result.stdout, 'output exists').to.be.ok;
                expect(chalk.stripColor(result.stdout), 'output value').to.equal('asdf\nFinished!\n');
            });
        });

        it('does not output anything for a non-existent file', function () {
            return run('config test').then(function afterConfig(result) {
                expect(result.stdout, 'output exists').to.be.ok;
                expect(chalk.stripColor(result.stdout), 'output value').to.equal('Finished!\n');
            });
        });

        it('does not output anything for a nonexistent variable in a config file', function () {
            fs.writeJsonSync(env.path('config/config.production.json'), {test: 'asdf'});

            return run('config test2').then(function afterConfig(result) {
                expect(result.stdout, 'output exists').to.be.ok;
                expect(chalk.stripColor(result.stdout), 'output value').to.equal('Finished!\n');
            });
        });
    });

    describe('when prompted', function () {
        it('prompts for host and saves correctly', function () {
            return run('config', {
                stdin: [
                    {when: /What is your blog url\?/gi, write: 'http://cli-test.com'}
                ]
            }).then(function afterConfig(result) {
                var contents;

                expect(result.stdout, 'output exists').to.be.ok;
                expect(chalk.stripColor(result.stdout), 'value').to.match(/What is your blog url\?/);

                contents = fs.readJsonSync(env.path('config/config.production.json'));
                expect(contents, 'config contents').to.be.ok;
                expect(contents.host, 'config host').to.equal('http://cli-test.com');
            });
        });
    });
});
