const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const Promise = require('bluebird');
const path = require('path');

const options = require('../../../../lib/tasks/configure/options');
const urlUtils = require('../../../../lib/utils/url');

describe('Unit: Tasks: Configure > options', function () {
    it('url', function () {
        expect(options.url).to.exist;

        // Check validate function
        expect(options.url.validate).to.equal(urlUtils.validate);

        // Check transform function
        expect(options.url.transform('http://MyUpperCaseUrl.com')).to.equal('http://myuppercaseurl.com');
    });

    it('adminUrl', function () {
        expect(options.adminUrl).to.exist;

        // Check validate function
        expect(options.adminUrl.validate('http://localhost:2368')).to.be.true;
        expect(options.adminUrl.validate('localhost:2368')).to.match(/Invalid domain/);
        expect(options.adminUrl.validate('not even remotely a domain')).to.match(/Invalid domain/);

        // Check transform function
        expect(options.adminUrl.transform('http://MyUpperCaseUrl.com')).to.equal('http://myuppercaseurl.com');
    });

    it('port', function () {
        const getPortPromise = sinon.stub().resolves('2367');
        const options = proxyquire('../../../../lib/tasks/configure/options', {portfinder: {getPortPromise}});

        expect(options.port).to.exist;

        // Check validate
        expect(options.port.validate('not an int')).to.match(/must be an integer/);

        return Promise.props({
            validateExpectsTrue: options.port.validate('2367'),
            validateExpectsMessage: options.port.validate('2366'),
            defaultCalledWithUrlPort: options.port.defaultValue({get: () => 'http://localhost:2369'}),
            defaultCalledWithNoUrlPort: options.port.defaultValue({get: () => 'http://example.com'})
        }).then((results) => {
            expect(results.validateExpectsTrue).to.be.true;
            expect(results.validateExpectsMessage).to.match(/'2366' is in use/);

            expect(getPortPromise.calledWithExactly({port: 2366})).to.be.true;
            expect(getPortPromise.calledWithExactly({port: 2367})).to.be.true;
            expect(getPortPromise.calledWithExactly({port: 2368})).to.be.true;
            expect(getPortPromise.calledWithExactly({port: 2369})).to.be.true;
        });
    });

    it('db', function () {
        expect(options.db).to.exist;
        expect(options.db.validate('mysql')).to.be.true;
        expect(options.db.validate('sqlite3')).to.be.true;
        expect(options.db.validate('pg')).to.match(/Invalid database type/);
    });

    it('dbpath', function () {
        expect(options.dbpath).to.exist;
        expect(options.dbpath.defaultValue({get: () => 'mysql'})).to.be.null;
        expect(options.dbpath.defaultValue({get: () => 'sqlite3'}, 'development')).to.equal(path.resolve('./content/data/ghost-dev.db'));
        expect(options.dbpath.defaultValue({get: () => 'sqlite3'}, 'production')).to.equal(path.resolve('./content/data/ghost.db'));
    });

    it('mail', function () {
        expect(options.mail).to.exist;
        expect(options.mail.validate('Sendmail')).to.be.true;
        expect(options.mail.validate('SMS')).to.match(/Invalid mail transport/);
    });

    it('mailservice', function () {
        expect(options.mailservice).to.exist;
        expect(options.mailservice.validate('Mailgun')).to.be.true;
        expect(options.mailservice.validate('CaspersFriendlyEmailService')).to.match(/Invalid mail service/);
    });

    it('process', function () {
        expect(options.process).to.exist;
        expect(options.process.defaultValue({}, 'production')).to.equal('systemd');
        expect(options.process.defaultValue({}, 'development')).to.equal('local');
    });
});
