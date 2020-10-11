'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const streams = require('stream');

// const modulePath = '../../../lib/ui/pretty-stream';
const PrettyStream = require('../../../lib/ui/pretty-stream');

describe('Unit: UI > PrettyStream', function () {
    afterEach(() => {
        sinon.restore();
    });

    describe('write', function () {
        it('stringifies data if data is a non-buffer object', function () {
            // Stub the prototype of the Transform class
            const writeStub = sinon.stub(streams.Transform.prototype, 'write');
            const testObject = {foo: 'bar', baz: 'bat'};

            const stream = new PrettyStream();
            stream.write(testObject, 'utf8', {callback: true});

            expect(writeStub.calledOnce).to.be.true;
            expect(writeStub.calledWithExactly(
                '{"foo":"bar","baz":"bat"}',
                'utf8',
                {callback: true}
            )).to.be.true;
        });

        it('passes through buffer objects without stringifying', function () {
            // Stub the prototype of the Transform class
            const writeStub = sinon.stub(streams.Transform.prototype, 'write');
            const testBuffer = Buffer.from('some test string', 'utf8');

            const stream = new PrettyStream();
            stream.write(testBuffer, 'utf8', {callback: true});

            expect(writeStub.calledOnce).to.be.true;
            expect(writeStub.calledWithExactly(testBuffer, 'utf8', {callback: true})).to.be.true;
        });

        it('passes through normal data', function () {
            // Stub the prototype of the Transform class
            const writeStub = sinon.stub(streams.Transform.prototype, 'write');
            const testData = 'a test string';

            const stream = new PrettyStream();
            stream.write(testData, 'utf8', {callback: true});

            expect(writeStub.calledOnce).to.be.true;
            expect(writeStub.calledWithExactly(testData, 'utf8', {callback: true})).to.be.true;
        });
    });

    describe('_transform', function () {
        function test(verbose, data, expected) {
            return new Promise((resolve) => {
                const ghostPrettyStream = new PrettyStream({verbose: verbose});
                const writeStream = new streams.Writable();

                writeStream._write = function (data) {
                    data = data.toString();
                    expect(data).to.equal(expected);
                    resolve();
                };

                ghostPrettyStream.pipe(writeStream);
                ghostPrettyStream.write(JSON.stringify(data));
            });
        }

        describe('non-verbose mode', function () {
            it('data.msg', function () {
                return test(false, {
                    time: '2016-07-01 00:00:00',
                    level: 30,
                    msg: 'Ghost starts now.'
                }, '[2016-07-01 00:00:00] \u001b[36mINFO\u001b[39m Ghost starts now.\n');
            });

            it('data.err', function () {
                return test(false, {
                    time: '2016-07-01 00:00:00',
                    level: 50,
                    msg: 'message',
                    err: {
                        message: 'Hey Jude!',
                        stack: 'stack',
                        code: 'HEY_JUDE'
                    }
                }, `[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[31mCODE: HEY_JUDE\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31mMESSAGE: Hey Jude!\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[37mstack\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m\n`);
            });

            it('data.req && data.res', function () {
                return test(false, {
                    time: '2016-07-01 00:00:00',
                    level: 30,
                    req: {
                        originalUrl: '/test',
                        method: 'GET',
                        body: {
                            a: 'b'
                        }
                    },
                    res: {
                        statusCode: 200,
                        responseTime: '39ms'
                    }
                }, '[2016-07-01 00:00:00] \u001b[36mINFO\u001b[39m "GET /test" \u001b[32m200\u001b[39m 39ms\n');
            });

            it('data.req && data.res, edge cases', function () {
                return test(false, {
                    time: '2016-07-01 00:00:00',
                    level: 30,
                    req: {
                        originalUrl: '/test',
                        method: 'GET',
                        body: {
                            a: 'b'
                        }
                    },
                    res: {
                        statusCode: 100,
                        responseTime: '39ms'
                    },
                    foo: '{"a": "b", "c": "d"}'
                }, '[2016-07-01 00:00:00] \u001b[36mINFO\u001b[39m "GET /test" 100 39ms\n');
            });

            it('data.req && data.res && data.err', function () {
                return test(false, {
                    time: '2016-07-01 00:00:00',
                    level: 50,
                    req: {
                        originalUrl: '/test',
                        method: 'GET',
                        body: {
                            a: 'b'
                        }
                    },
                    res: {
                        statusCode: 400,
                        responseTime: '39ms'
                    },
                    err: {
                        message: 'message',
                        stack: 'stack'
                    }
                }, `[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m "GET /test" \u001b[33m400\u001b[39m 39ms
\u001b[31m\u001b[39m
\u001b[31m\u001b[31mMESSAGE: message\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[37mstack\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m\n`);
            });
        });

        describe('verbose mode', function () {
            it('data.msg', function () {
                return test(true, {
                    time: '2016-07-01 00:00:00',
                    level: 30,
                    msg: 'Ghost starts now.'
                }, '[2016-07-01 00:00:00] \u001b[36mINFO\u001b[39m Ghost starts now.\n');
            });

            it('data.err', function () {
                return test(true, {
                    time: '2016-07-01 00:00:00',
                    level: 50,
                    err: {
                        message: 'Hey Jude!',
                        stack: 'stack'
                    }
                }, `[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[31mMESSAGE: Hey Jude!\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[37mstack\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m\n\n`);
            });

            it('data.req && data.res', function () {
                return test(true, {
                    time: '2016-07-01 00:00:00',
                    level: 30,
                    req: {
                        ip: '127.0.01',
                        originalUrl: '/test',
                        method: 'GET',
                        body: {
                            a: 'b'
                        }
                    },
                    res: {
                        statusCode: 300,
                        responseTime: '39ms'
                    }
                }, `[2016-07-01 00:00:00] \u001b[36mINFO\u001b[39m "GET /test" \u001b[36m300\u001b[39m 39ms
\u001b[90m\u001b[39m
\u001b[90m\u001b[33mREQ\u001b[39m\u001b[90m\u001b[39m
\u001b[90m\u001b[32mip: \u001b[39m\u001b[90m         127.0.01\u001b[39m
\u001b[90m\u001b[32moriginalUrl: \u001b[39m\u001b[90m/test\u001b[39m
\u001b[90m\u001b[32mmethod: \u001b[39m\u001b[90m     GET\u001b[39m
\u001b[90m\u001b[32mbody: \u001b[39m\u001b[90m\u001b[39m
\u001b[90m  \u001b[32ma: \u001b[39m\u001b[90mb\u001b[39m
\u001b[90m\u001b[39m
\u001b[90m\u001b[33mRES\u001b[39m\u001b[90m\u001b[39m
\u001b[90m\u001b[32mresponseTime: \u001b[39m\u001b[90m39ms\u001b[39m
\u001b[90m\u001b[39m\n`);
            });

            it('data.req && data.res && data.err', function () {
                return test(true, {
                    time: '2016-07-01 00:00:00',
                    level: 50,
                    req: {
                        originalUrl: '/test',
                        method: 'GET',
                        body: {
                            a: 'b'
                        }
                    },
                    res: {
                        statusCode: 500,
                        responseTime: '39ms'
                    },
                    err: {
                        message: 'Hey Jude!',
                        stack: 'stack'
                    }
                }, `[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m "GET /test" \u001b[31m500\u001b[39m 39ms
\u001b[31m\u001b[39m
\u001b[31m\u001b[31mMESSAGE: Hey Jude!\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[37mstack\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[90m\u001b[39m
\u001b[90m\u001b[33mREQ\u001b[39m\u001b[90m\u001b[39m
\u001b[90m\u001b[32moriginalUrl: \u001b[39m\u001b[90m/test\u001b[39m
\u001b[90m\u001b[32mmethod: \u001b[39m\u001b[90m     GET\u001b[39m
\u001b[90m\u001b[32mbody: \u001b[39m\u001b[90m\u001b[39m
\u001b[90m  \u001b[32ma: \u001b[39m\u001b[90mb\u001b[39m
\u001b[90m\u001b[39m
\u001b[90m\u001b[33mRES\u001b[39m\u001b[90m\u001b[39m
\u001b[90m\u001b[32mresponseTime: \u001b[39m\u001b[90m39ms\u001b[39m
\u001b[90m\u001b[39m\n`);
            });

            it('data.err contains error details', function () {
                return test(true, {
                    time: '2016-07-01 00:00:00',
                    level: 50,
                    err: {
                        message: 'Hey Jude!',
                        stack: 'stack',
                        errorDetails: [{
                            level: 'error',
                            rule: 'Templates must contain valid Handlebars.',
                            failures: [{ref: 'default.hbs', message: 'Missing helper: "image"'}],
                            code: 'GS005-TPL-ERR'
                        }]
                    }
                }, `[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[31mMESSAGE: Hey Jude!\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[31mERROR DETAILS:\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m    level:    error\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m    rule:     Templates must contain valid Handlebars.\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m    failures: \u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m      - \u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m        ref:     default.hbs\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m        message: Missing helper: "image"\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m    code:     GS005-TPL-ERR\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[37mstack\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m\n\n`);
            });

            it('data.err can render single error detail object', function () {
                return test(true, {
                    time: '2016-07-01 00:00:00',
                    level: 50,
                    err: {
                        message: 'Hey Jude!',
                        stack: 'stack',
                        errorDetails: {
                            level: 'error',
                            rule: 'Templates must contain valid Handlebars.',
                            failures: [{ref: 'default.hbs', message: 'Missing helper: "image"'}],
                            code: 'GS005-TPL-ERR'
                        }
                    }
                }, `[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[31mMESSAGE: Hey Jude!\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[31mERROR DETAILS:\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m    level:    error\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m    rule:     Templates must contain valid Handlebars.\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m    failures: \u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m      - \u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m        ref:     default.hbs\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m        message: Missing helper: "image"\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31m    code:     GS005-TPL-ERR\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[37mstack\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m\n\n`);
            });

            it('verbose, edge cases', function () {
                return test(true, {
                    time: '2016-07-01 00:00:00',
                    level: 50,
                    err: {
                        message: 'whoops',
                        stack: 'some stack trace',
                        hideStack: true,
                        name: 'InternalServerError',
                        level: 'error',
                        context: 'Context is key',
                        help: 'Go to docs'
                    }
                }, `[2016-07-01 00:00:00] \u001b[31mERROR\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[31mNAME: InternalServerError\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[31mMESSAGE: whoops\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[37mlevel: error\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m
\u001b[31m\u001b[37mContext is key\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[37mGo to docs\u001b[39m\u001b[31m\u001b[39m
\u001b[31m\u001b[39m\n\n`);
            });
        });
    });
});
