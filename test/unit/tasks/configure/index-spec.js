const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const modulePath = '../../../../lib/tasks/configure';

function fake() {
    const parseOptions = sinon.stub().resolves();
    const getPrompts = sinon.stub();

    const configure = proxyquire(modulePath, {
        './parse-options': parseOptions,
        './get-prompts': getPrompts
    });

    return {configure, parseOptions, getPrompts};
}

describe('Unit: Tasks > configure', function () {
    it('returns parseOptions if prompt is false', function () {
        const {configure, parseOptions, getPrompts} = fake();

        return configure({}, {config: true}, {prompt: true}, 'development', false).then(() => {
            expect(parseOptions.calledOnce).to.be.true;
            expect(getPrompts.called).to.be.false;

            expect(parseOptions.args[0]).to.deep.equal([
                {config: true},
                'development',
                {prompt: true}
            ]);
        });
    });

    it('returns parseOptions if argv.prompt is false', function () {
        const {configure, parseOptions, getPrompts} = fake();

        return configure({}, {config: true}, {prompt: false}, 'development').then(() => {
            expect(parseOptions.calledOnce).to.be.true;
            expect(getPrompts.called).to.be.false;

            expect(parseOptions.args[0]).to.deep.equal([
                {config: true},
                'development',
                {prompt: false}
            ]);
        });
    });

    it('returns parseOptions if getPrompts returns no prompts', function () {
        const {configure, parseOptions, getPrompts} = fake();
        getPrompts.returns([]);

        const prompt = sinon.stub().resolves();

        return configure({prompt}, {config: true}, {prompt: true, url: 'http://ghost.test'}, 'development').then(() => {
            expect(parseOptions.calledOnce).to.be.true;
            expect(getPrompts.calledOnce).to.be.true;
            expect(prompt.called).to.be.false;

            expect(parseOptions.args[0]).to.deep.equal([
                {config: true},
                'development',
                {prompt: true, url: 'http://ghost.test'}
            ]);
            expect(getPrompts.args[0]).to.deep.equal([
                {config: true},
                {prompt: true, url: 'http://ghost.test'},
                'development'
            ]);
        });
    });

    it('calls prompt and handles db values correctly (1)', function () {
        const {configure, parseOptions, getPrompts} = fake();
        const prompt = sinon.stub().resolves({
            dbhost: 'localhost',
            dbuser: 'root',
            dbpass: 'password'
        });
        getPrompts.returns([{promptA: true}, {promptB: true}]);

        return configure({prompt}, {config: true}, {prompt: true, url: 'http://ghost.test'}, 'development').then(() => {
            expect(parseOptions.calledOnce).to.be.true;
            expect(getPrompts.calledOnce).to.be.true;
            expect(prompt.calledOnce).to.be.true;

            expect(getPrompts.args[0]).to.deep.equal([
                {config: true},
                {prompt: true, url: 'http://ghost.test'},
                'development'
            ]);
            expect(prompt.args[0]).to.deep.equal([
                [{promptA: true}, {promptB: true}]
            ]);
            expect(parseOptions.args[0]).to.deep.equal([
                {config: true},
                'development',
                {
                    prompt: true,
                    url: 'http://ghost.test',
                    db: 'mysql',
                    dbhost: 'localhost',
                    dbuser: 'root',
                    dbpass: 'password'
                }
            ]);
        });
    });

    it('calls prompt and handles db values correctly (2)', function () {
        const {configure, parseOptions, getPrompts} = fake();
        const prompt = sinon.stub().resolves({
            url: 'http://ghost.test'
        });
        getPrompts.returns([{promptA: true}, {promptB: true}]);

        return configure({prompt}, {config: true}, {prompt: true}, 'development').then(() => {
            expect(parseOptions.calledOnce).to.be.true;
            expect(getPrompts.calledOnce).to.be.true;
            expect(prompt.calledOnce).to.be.true;

            expect(getPrompts.args[0]).to.deep.equal([{config: true}, {prompt: true}, 'development']);
            expect(prompt.args[0]).to.deep.equal([
                [{promptA: true}, {promptB: true}]
            ]);
            expect(parseOptions.args[0]).to.deep.equal([
                {config: true},
                'development',
                {
                    prompt: true,
                    url: 'http://ghost.test'
                }
            ]);
        });
    });
});
