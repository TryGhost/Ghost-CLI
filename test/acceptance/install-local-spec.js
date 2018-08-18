'use strict';

const {expect} = require('chai');
const fs = require('fs-extra');

const AcceptanceTest = require('../utils/acceptance-test');

describe('Acceptance: Install Local (~35second test)', function () {
    it('can do a local install, anywhere!', function () {
        const timeout = 100000;

        // This command is slow
        this.timeout(timeout);
        const testInstall = new AcceptanceTest('install local');
        testInstall.setup();

        return testInstall.run({failOnStdErr: true}).then((result) => {
            expect(result.stdout, 'output exists').to.be.ok;
            // Very simple output check to verify we got something we expected, port number can change!
            expect(result.stdout, 'output').to.match(/http:\/\/localhost:23/);

            expect(fs.existsSync(testInstall.path('config.development.json')), 'development config exists').to.be.true;

            const contents = fs.readJsonSync(testInstall.path('config.development.json'));

            expect(contents, 'contents of config file').to.be.ok;

            expect(contents.url, 'config url').to.match(/http:\/\/localhost:23/);
            expect(contents.server.host, 'config host').to.equal('127.0.0.1');
            expect(contents.database.client, 'config db').to.equal('sqlite3');
            expect(contents.mail.transport, 'config mail transport').to.equal('Direct');
            expect(contents.logging.transports, 'config logging transport').to.eql(['file', 'stdout']);
            expect(contents.process, 'config process').to.equal('local');

            const testStop = new AcceptanceTest('stop', {dir: testInstall.dir});
            return testStop.run();
        }).finally(() => {
            testInstall.cleanupDir();
        });
    });
});
