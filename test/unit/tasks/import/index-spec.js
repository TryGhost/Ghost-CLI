const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const Promise = require('bluebird');
const createConfigStub = require('../../../utils/config-stub');

const modulePath = '../../../../lib/tasks/import';

describe('Unit: Tasks > Import', function () {
    it('works with already set up blog', async function () {
        const parseExport = sinon.stub().returns({data: {name: 'test', email: 'test@example.com', blogTitle: 'test'}});
        const isSetup = sinon.stub().resolves(true);
        const setup = sinon.stub().resolves();
        const runImport = sinon.stub().resolves();

        const task = proxyquire(modulePath, {
            './parse-export': parseExport,
            './api': {isSetup, setup, runImport}
        });

        const prompt = sinon.stub().resolves({username: 'setup@example.com', password: '1234567890'});
        const listr = sinon.stub().callsFake(tasks => Promise.each(tasks, async (t) => {
            if (t.enabled && !t.enabled()) {
                return;
            }

            await t.task();
        }));
        const config = createConfigStub();
        config.get.withArgs('url').returns('http://localhost:2368');

        await task({prompt, listr}, {config, version: '1.0.0'}, 'test-export.json');

        expect(parseExport.calledOnceWithExactly('test-export.json')).to.be.true;
        expect(isSetup.calledOnceWithExactly('1.0.0', 'http://localhost:2368')).to.be.true;
        expect(prompt.calledOnce).to.be.true;
        expect(prompt.args[0][0]).to.have.length(2);

        const usernamePrompt = prompt.args[0][0][0];
        const passwordPrompt = prompt.args[0][0][1];

        expect(usernamePrompt.validate('test@example.com')).to.be.true;
        expect(usernamePrompt.validate('not an email')).to.include('valid email');
        expect(passwordPrompt.validate('1234567890')).to.be.true;
        expect(passwordPrompt.validate('short')).to.include('10 characters long');

        expect(listr.calledOnce).to.be.true;
        expect(setup.called).to.be.false;
        expect(runImport.calledOnceWithExactly('1.0.0', 'http://localhost:2368', {
            username: 'setup@example.com',
            password: '1234567890'
        }, 'test-export.json')).to.be.true;
    });

    it('works with not setup blog', async function () {
        const parseExport = sinon.stub().returns({data: {name: 'test', email: 'test@example.com', blogTitle: 'test'}});
        const isSetup = sinon.stub().resolves(false);
        const setup = sinon.stub().resolves();
        const runImport = sinon.stub().resolves();

        const task = proxyquire(modulePath, {
            './parse-export': parseExport,
            './api': {isSetup, setup, runImport}
        });

        const prompt = sinon.stub().resolves({password: '1234567890'});
        const listr = sinon.stub().callsFake(tasks => Promise.each(tasks, async (t) => {
            if (t.enabled && !t.enabled()) {
                return;
            }

            await t.task();
        }));
        const config = createConfigStub();
        config.get.withArgs('url').returns('http://localhost:2368');

        await task({prompt, listr}, {config, version: '1.0.0'}, 'test-export.json');

        expect(parseExport.calledOnceWithExactly('test-export.json')).to.be.true;
        expect(isSetup.calledOnceWithExactly('1.0.0', 'http://localhost:2368')).to.be.true;
        expect(prompt.calledOnce).to.be.true;
        expect(prompt.args[0][0]).to.have.length(1);
        expect(listr.calledOnce).to.be.true;
        expect(setup.calledOnceWithExactly('1.0.0', 'http://localhost:2368', {
            name: 'test',
            email: 'test@example.com',
            blogTitle: 'test',
            password: '1234567890'
        })).to.be.true;
        expect(runImport.calledOnceWithExactly('1.0.0', 'http://localhost:2368', {
            username: 'test@example.com',
            password: '1234567890'
        }, 'test-export.json')).to.be.true;
    });
});
