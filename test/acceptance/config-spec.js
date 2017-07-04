'use strict';
const expect = require('chai').expect;
const chalk = require('chalk');
const fs  = require('fs-extra');

const AcceptanceTest = require('../utils/acceptance-test');

describe('Acceptance: Config', function () {
    describe('when used as a setter', function () {
        it('creates file with default environment', function () {
            let test = new AcceptanceTest('config test asdf');
            test.setup('full');

            return test.run({failOnStdErr: true}).then(() => {
                expect(fs.existsSync(test.path('config.production.json')), 'production config exists').to.be.true;
                let contents = fs.readJsonSync(test.path('config.production.json'));

                expect(contents, 'contents of config file').to.be.ok;
                expect(contents.test, 'created config variable').to.equal('asdf');
            });
        });

        it('creates file with specified environment', function () {
            let test = new AcceptanceTest('config test asdf --development');
            test.setup('full');

            return test.run({failOnStdErr: true}).then(() => {
                expect(fs.existsSync(test.path('config.development.json')), 'development config exists').to.be.true;
                let contents = fs.readJsonSync(test.path('config.development.json'));

                expect(contents, 'contents of config file').to.be.ok;
                expect(contents.test, 'created config variable').to.equal('asdf');
            });
        });

        it('adds value to existing file', function () {
            let test = new AcceptanceTest('config test asdf');
            test.setup('full');

            fs.writeJsonSync(test.path('config.production.json'), {port: 1234});

            return test.run({failOnStdErr: true}).then(() => {
                expect(fs.existsSync(test.path('config.production.json')), 'production config exists').to.be.true;
                let contents = fs.readJsonSync(test.path('config.production.json'));

                expect(contents, 'contents of config file').to.be.ok;
                expect(contents.test, 'created config variable').to.equal('asdf');
                expect(contents.port, 'existing config variable').to.equal(1234);
            });
        });
    });

    describe('when used as a getter', function () {
        it('can get value of existing config file', function () {
            let test = new AcceptanceTest('config test');
            test.setup('full');

            fs.writeJsonSync(test.path('config.production.json'), {test: 'asdf'});

            return test.run({failOnStdErr: true}).then((result) => {
                expect(result.stdout, 'output exists').to.be.ok;
                expect(chalk.stripColor(result.stdout), 'output value').to.equal('asdf\n');
            });
        });

        it('can get value of existing file with environment option', function () {
            let test = new AcceptanceTest('config test --development');
            test.setup('full');

            fs.writeJsonSync(test.path('config.development.json'), {test: 'asdf'});

            return test.run({failOnStdErr: true}).then((result) => {
                expect(result.stdout, 'output exists').to.be.ok;
                expect(chalk.stripColor(result.stdout), 'output value').to.equal('asdf\n');
            });
        });

        it('does not output anything for a non-existent file', function () {
            let test = new AcceptanceTest('config test');
            test.setup('full');

            return test.run({failOnStdErr: true}).then((result) => {
                expect(result.stdout, 'output value').to.equal('');
            });
        });

        it('does not output anything for a nonexistent variable in a config file', function () {
            let test = new AcceptanceTest('config test2');
            test.setup('full');

            fs.writeJsonSync(test.path('config.production.json'), {test: 'asdf'});

            return test.run({failOnStdErr: true}).then((result) => {
                expect(result.stdout, 'output value').to.equal('');
            });
        });
    });

    describe('when prompted', function () {
        it('prompts for host and saves correctly', function () {
            let test = new AcceptanceTest('config');
            test.setup('full');

            return test.spawn({
                environment: 'production',
                failOnStdErr: true,
                checkOutput: () => false,
                stdin: [
                    {when: /Enter your blog URL:/gi, write: 'http://cli-test.com'},
                    {when: /MySQL hostname/gi, write: 'localhost'},
                    {when: /MySQL username/gi, write: 'root'},
                    {when: /MySQL password/gi, write: 'password'},
                    {when: /Ghost database name/gi, write: ''}
                ]
            }).then((result) => {
                expect(result.stdout, 'output exists').to.be.ok;
                expect(chalk.stripColor(result.stdout), 'value').to.match(/Enter your blog URL:/);

                let contents = fs.readJsonSync(test.path('config.production.json'));
                expect(contents, 'config contents').to.be.ok;
                expect(contents.url, 'config host').to.equal('http://cli-test.com');
            });
        });
    });
});
