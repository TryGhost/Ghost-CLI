const {expect} = require('chai');

const Config = require('../../../../lib/utils/config');
const getPrompts = require('../../../../lib/tasks/configure/get-prompts');
const {validate: validateUrl, ensureProtocol} = require('../../../../lib/utils/url');

describe('Unit: Tasks: Configure > getPrompts', function () {
    it('returns no prompts if url is defined and db is sqlite3', function () {
        const config = new Config('config.json');
        const prompts = getPrompts(config, {
            url: 'someurl.com',
            db: 'sqlite3'
        }, 'development');

        expect(prompts).to.deep.equal([]);
    });

    it('returns url prompt with validator if url is not provided and db is sqlite3', function () {
        const config = new Config('config.json');
        const prompts = getPrompts(config, {db: 'sqlite3'}, 'development');

        expect(prompts).to.have.length(1);
        expect(prompts[0].name).to.equal('url');
        expect(prompts[0].default).to.equal('http://localhost:2368');
        expect(prompts[0].validate).to.equal(validateUrl);
        expect(prompts[0].filter).to.equal(ensureProtocol);
    });

    it('returns url prompt with correct defaults', function () {
        const config = new Config('config.json');
        const prompts = getPrompts(config, {db: 'sqlite3', auto: true}, 'development');

        expect(prompts).to.have.length(1);
        expect(prompts[0].name).to.equal('url');
        expect(prompts[0].default).to.be.null;
        expect(prompts[0].validate).to.equal(validateUrl);
        expect(prompts[0].filter).to.equal(ensureProtocol);
    });

    it('returns db prompts if db arg not provided', function () {
        const config = new Config('config.json');
        const prompts = getPrompts(config, {url: 'http://localhost.com'}, 'development');

        expect(prompts).to.have.length(4);
        expect(prompts.find(prompt => prompt.name === 'dbhost')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbuser')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbpass')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbname')).to.be.ok;
    });

    it('returns db prompts if db arg is not sqlite3', function () {
        const config = new Config('config.json');
        config.set('database.connection.password', 'password');
        const prompts = getPrompts(config, {url: 'http://localhost.com', db: 'mysql'}, 'development');

        expect(prompts).to.have.length(4);
        expect(prompts.find(prompt => prompt.name === 'dbhost')).to.be.ok;

        const userprompt = prompts.find(prompt => prompt.name === 'dbuser');
        expect(userprompt).to.be.ok;
        expect(userprompt.validate('')).to.match(/must supply a MySQL username/);
        expect(userprompt.validate('root')).to.be.true;

        const passprompt = prompts.find(prompt => prompt.name === 'dbpass');
        expect(passprompt).to.be.ok;
        expect(passprompt.message).to.match(/skip to keep current/);
        expect(passprompt.default).to.equal('password');

        const nameprompt = prompts.find(prompt => prompt.name === 'dbname');
        expect(nameprompt).to.be.ok;
        expect(nameprompt.validate('example123')).to.be.true;
        expect(nameprompt.validate('example123.com')).to.match(/consist of only alpha/);
        expect(nameprompt.validate('example-123')).to.match(/consist of only alpha/);
        expect(nameprompt.validate('example!!!')).to.match(/consist of only alpha/);
    });

    it('doesn\'t return dbhost prompt if dbhost provided', function () {
        const config = new Config('config.json');
        const prompts = getPrompts(config, {url: 'http://localhost.com', db: 'mysql', dbhost: 'localhost'}, 'development');

        expect(prompts).to.have.length(3);
        expect(prompts.find(prompt => prompt.name === 'dbhost')).to.not.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbuser')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbpass')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbname')).to.be.ok;
    });

    it('doesn\'t return dbuser prompt if dbuser provided', function () {
        const config = new Config('config.json');
        const prompts = getPrompts(config, {url: 'http://localhost.com', db: 'mysql', dbuser: 'root'}, 'development');

        expect(prompts).to.have.length(3);
        expect(prompts.find(prompt => prompt.name === 'dbhost')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbuser')).to.not.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbpass')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbname')).to.be.ok;
    });

    it('doesn\'t return dbpass prompt if dbpass provided', function () {
        const config = new Config('config.json');
        const prompts = getPrompts(config, {url: 'http://localhost.com', db: 'mysql', dbpass: 'password'}, 'development');

        expect(prompts).to.have.length(3);
        expect(prompts.find(prompt => prompt.name === 'dbhost')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbuser')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbpass')).to.not.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbname')).to.be.ok;
    });

    it('doesn\'t return dbname prompt if dbname provided', function () {
        const config = new Config('config.json');
        const prompts = getPrompts(config, {url: 'http://localhost.com', db: 'mysql', dbname: 'ghost'}, 'development');

        expect(prompts).to.have.length(3);
        expect(prompts.find(prompt => prompt.name === 'dbhost')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbuser')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbpass')).to.be.ok;
        expect(prompts.find(prompt => prompt.name === 'dbname')).to.not.be.ok;
    });

    it('dbname prompt generates proper default filename', function () {
        const config = new Config('config.json');
        const argv = {
            url: 'http://localhost.com',
            db: 'mysql',
            dbhost: 'localhost',
            dbuser: 'ghost_rnd',
            dbpass: 'good_pass'
        };

        const prompts = getPrompts(config, argv, 'production');
        expect(prompts[0].default).to.match(/_prod/);

        const prompts2 = getPrompts(config, argv, 'development');
        expect(prompts2[0].default).to.match(/_dev/);
    });
});
