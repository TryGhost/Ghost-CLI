'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const configStub = require('../../../utils/config-stub');
const stripAnsi = require('strip-ansi');

describe('Unit: Tasks > Major Update > UI', function () {
    let ui, dataMock, ctx;

    beforeEach(function () {
        ctx = {
            instance: sinon.stub(),
            ui: sinon.stub(),
            version: '1.25.4'
        };

        ctx.ui.log = sinon.stub();
        ctx.ui.confirm = sinon.stub();

        ctx.instance.config = configStub();
        ctx.instance.config.get.withArgs('url').returns('http://localhost:2368/');
        dataMock = sinon.stub();

        ui = proxyquire('../../../../lib/tasks/major-update/ui', {
            './data': dataMock
        });
    });

    it('theme is compatible', async function () {
        ctx.ui.confirm.resolves(true);

        dataMock.resolves({
            gscanReport: {
                results: {
                    error: {
                        all: []
                    },
                    warning: {
                        all: []
                    }
                }
            },
            demoPost: {
                uuid: '1234'
            }
        });

        await ui(ctx);
        expect(ctx.ui.log.callCount).to.eql(4);
        expect(ctx.ui.confirm.calledOnce).to.be.true;
        expect(ctx.ui.confirm.args[0][1], 'confirm prompt default should be true').to.be.true;
    });

    it('theme has warnings', async function () {
        ctx.ui.confirm.resolves(true);

        dataMock.resolves({
            gscanReport: {
                results: {
                    error: {
                        all: []
                    },
                    warning: {
                        all: [{RULE_01: {failures: [{ref: 'index.hbs'}]}}],
                        byFiles: {'index.hbs': [{rule: '<code>Replace this.</code>'}]}
                    }
                }
            },
            demoPost: {
                uuid: '1234'
            }
        });

        await ui(ctx);
        expect(ctx.ui.log.callCount).to.eql(6);
        expect(ctx.ui.confirm.calledTwice).to.be.true;
        expect(ctx.ui.confirm.args[1][1], 'confirm prompt default should be false').to.be.false;

        const output = stripAnsi(ctx.ui.log.args.join(' '));

        expect(output.match(/Your theme has 1 warning/)).to.exist;
        expect(output.match(/File: index.hbs/)).to.exist;
        expect(output.match(/- Replace this/)).to.exist;
        expect(output.match(/Visit the demo post at http:\/\/localhost:2368\/p\/1234\//)).to.exist;
        expect(output.match(/check theme compatibility at https:\/\/gscan.ghost.org/)).to.exist;
    });

    it('theme has errors', async function () {
        ctx.ui.confirm.resolves(true);

        dataMock.resolves({
            gscanReport: {
                results: {
                    error: {
                        all: [{RULE_10: {failures: [{ref: 'post.hbs'}, {ref: 'page.hbs'}]}}, {RULE_20: {failures: [{ref: 'page.hbs'}]}}],
                        byFiles: {
                            'post.hbs': [{rule: '<b>This is an Error.</b>'}],
                            'page.hbs': [{rule: '<b>This is another Error.</b>'}, {rule: '<b>This is an Error.</b>'}]
                        }
                    },
                    warning: {
                        all: []
                    }
                }
            },
            demoPost: {
                uuid: '1234'
            }
        });

        await ui(ctx);
        expect(ctx.ui.log.callCount).to.eql(7);
        expect(ctx.ui.confirm.calledTwice).to.be.true;
        expect(ctx.ui.confirm.args[1][1], 'confirm prompt default should be false').to.be.false;

        const output = stripAnsi(ctx.ui.log.args.join(' '));

        expect(output.match(/Your theme has 2 errors/)).to.exist;
        expect(output.match(/File: post.hbs/)).to.exist;
        expect(output.match(/File: page.hbs/)).to.exist;
        expect(output.match(/This is an Error./g).length).to.eql(2);
        expect(output.match(/This is another Error./g).length).to.eql(1);
    });

    it('theme has errors and warnings', async function () {
        ctx.ui.confirm.onFirstCall().resolves(true);
        ctx.ui.confirm.onSecondCall().resolves(false);

        dataMock.resolves({
            gscanReport: {
                results: {
                    error: {
                        all: [{RULE_10: {failures: [{ref: 'post.hbs'}, {ref: 'page.hbs'}]}}],
                        byFiles: {
                            'post.hbs': [{rule: '<b>This is an Error.</b>'}]
                        }
                    },
                    warning: {
                        all: [{RULE_01: {failures: [{ref: 'package.json'}]}}, {RULE_20: {failures: [{ref: 'page.hbs'}]}}],
                        byFiles: {
                            'package.json': [{rule: 'This attribute is important.'}],
                            'page.hbs': [{rule: '<b>This is a warning.</b>'}]
                        }
                    }
                }
            }
        });

        try {
            await ui(ctx);
        } catch (err) {
            expect(err.message).to.match(/Update aborted/);
            expect(err.logMessageOnly).to.be.true;

            expect(ctx.ui.log.callCount).to.eql(8);
            expect(ctx.ui.confirm.calledTwice).to.be.true;

            const output = stripAnsi(ctx.ui.log.args.join(' '));

            expect(output.match(/Your theme has 1 error and 2 warnings/)).to.exist;
            expect(output.match(/File: post.hbs/)).to.exist;
            expect(output.match(/File: page.hbs/)).to.exist;
            expect(output.match(/File: package.json/)).to.exist;
            expect(output.match(/This is an Error./g).length).to.eql(1);
            expect(output.match(/This is a warning./g).length).to.eql(1);
            expect(output.match(/This attribute is important./g).length).to.eql(1);
            return;
        }

        expect.fail('should have thrown an error');
    });

    it('theme has fatal errors and warnings', async function () {
        ctx.ui.confirm.resolves(true);

        dataMock.resolves({
            gscanReport: {
                results: {
                    hasFatalErrors: true,
                    error: {
                        all: [{RULE_10: {failures: [{ref: 'post.hbs'}, {ref: 'page.hbs'}]}}, {RULE_20: {failures: [{ref: 'page.hbs'}]}}],
                        byFiles: {
                            'post.hbs': [{rule: '<b>This is an Error.</b>', fatal: true}],
                            'page.hbs': [{rule: '<b>This is another Error.</b>'}, {rule: '<b>This is an Error.</b>'}]
                        }
                    },
                    warning: {
                        all: [{RULE_01: {failures: [{ref: 'package.json'}]}}],
                        byFiles: {'package.json': [{rule: 'This attribute is important.'}]}
                    }
                }
            },
            demoPost: {
                uuid: '1234'
            }
        });

        try {
            await ui(ctx);
        } catch (err) {
            expect(err.message).to.match(/Migration failed. Your theme has fatal errors/);
            expect(err.logMessageOnly).to.exist;

            expect(ctx.ui.log.callCount).to.eql(9);
            expect(ctx.ui.confirm.calledOnce).to.be.true;

            const output = stripAnsi(ctx.ui.log.args.join(' '));

            expect(output.match(/Your theme has 2 errors and 1 warning/)).to.exist;
            expect(output.match(/File: post.hbs/)).to.exist;
            expect(output.match(/File: page.hbs/)).to.exist;
            expect(output.match(/File: package.json/)).to.exist;
            expect(output.match(/This is an Error./g).length).to.eql(2);
            expect(output.match(/This is another Error./g).length).to.eql(1);
            expect(output.match(/This attribute is important./g).length).to.eql(1);
            return;
        }

        expect.fail('should have thrown an error');
    });
});
