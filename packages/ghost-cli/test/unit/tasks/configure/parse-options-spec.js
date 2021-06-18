const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const Config = require('../../../../lib/utils/config');
const {ConfigError} = require('../../../../lib/errors');

function fake(options = {}) {
    return proxyquire('../../../../lib/tasks/configure/parse-options', {
        './options': options
    });
}

describe('Unit: Tasks: Configure > parseOptions', function () {
    it('sets config url to new port if port is different then what url is set to', function () {
        const parseOptions = fake();
        const config = new Config('config.json');
        const saveStub = sinon.stub(config, 'save');

        config.set('url', 'http://localhost:2368');
        config.set('server.port', 2369);

        return parseOptions(config, 'development', {}).then(() => {
            expect(config.get('url')).to.equal('http://localhost:2369/');
            expect(config.get('server.port')).to.equal(2369);
            expect(saveStub.calledOnce).to.be.true;
        });
    });

    it('does not change port if port not defined', function () {
        const parseOptions = fake();
        const config = new Config('config.json');
        const saveStub = sinon.stub(config, 'save');

        config.set('url', 'http://localhost:2368');

        return parseOptions(config, 'development', {}).then(() => {
            expect(config.get('url')).to.equal('http://localhost:2368');
            expect(config.get('server.port', null)).to.equal(null);
            expect(saveStub.calledOnce).to.be.true;
        });
    });

    it('handles nonexistent values correctly', function () {
        const parseOptions = fake({
            url: {
                defaultValue: 'http://localhost:2368'
            },
            port: {
                configPath: 'server.port'
            },
            log: {
                configPath: 'logging.transports',
                defaultValue() {
                    return Promise.resolve(['file', 'stdout']);
                }
            }
        });
        const config = new Config('config.json');
        const saveStub = sinon.stub(config, 'save');

        return parseOptions(config, 'development', {log: []}).then(() => {
            expect(config.get('url')).to.equal('http://localhost:2368');
            expect(config.get('server.port')).to.be.undefined;
            expect(config.get('logging.transports')).to.deep.equal(['file', 'stdout']);
            expect(saveStub.calledOnce).to.be.true;
        });
    });

    it('runs the transform function if one is set', function () {
        const parseOptions = fake({
            url: {
                transform: value => value.toLowerCase()
            }
        });
        const config = new Config('config.json');
        const saveStub = sinon.stub(config, 'save');

        return parseOptions(config, 'development', {url: 'http://MyWebsite.com'}).then(() => {
            expect(config.get('url')).to.equal('http://mywebsite.com');
            expect(saveStub.calledOnce).to.be.true;
        });
    });

    it('transforms domain without protocol', function () {
        const parseOptions = require('../../../../lib/tasks/configure/parse-options');
        const config = new Config('config.json');
        const saveStub = sinon.stub(config, 'save');

        return parseOptions(config, 'development', {url: 'myWebsite.com'}).then(() => {
            expect(config.get('url')).to.equal('https://mywebsite.com');
            expect(saveStub.calledOnce).to.be.true;
        });
    });

    it('throws config error if validate function is defined and doesn\'t return true', function () {
        const parseOptions = fake({
            url: {
                validate: () => 'invalid url'
            }
        });
        const config = new Config('config.json');

        return parseOptions(config, 'development', {url: 'http://localhost:2368'}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(ConfigError);
            expect(error.options.config).to.deep.equal({url: 'http://localhost:2368'});
        });
    });

    it('handles non-string arg values correctly', function () {
        const parseOptions = require('../../../../lib/tasks/configure/parse-options');
        const config = new Config('config.json');
        const save = sinon.stub(config, 'save');

        return parseOptions(config, 'development', {url: 'http://localhost:2368/', port: 1234}).then(() => {
            expect(save.calledOnce).to.be.true;
            expect(config.get('url')).to.equal('http://localhost:2368/');
            expect(config.get('server.port')).to.equal(1234);
        });
    });
});
