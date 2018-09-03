'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const net = require('net');

const portPolling = require('../../../lib/utils/port-polling');

describe('Unit: Utils > portPolling', function () {
    this.slow(1000);

    afterEach(function () {
        sinon.restore();
    });

    it('port is missing', function () {
        return portPolling()
            .then(() => {
                throw new Error('Expected error');
            })
            .catch((err) => {
                expect(err.message).to.eql('Port is required.');
            });
    });

    describe('useNetServer is enabled', function () {
        it('Ghost does start', function () {
            const netStub = sinon.stub();
            const socketStub = sinon.stub();

            socketStub.on = sinon.stub().callsFake((event, cb) => {
                if (event === 'data') {
                    cb(JSON.stringify({started: true}));
                }
            });

            socketStub.destroy = sinon.stub();

            netStub.listen = sinon.stub();
            netStub.close = sinon.stub().callsFake((cb) => {
                cb();
            });

            sinon.stub(net, 'createServer').callsFake((fn) => {
                setTimeout(() => {
                    fn(socketStub);
                }, 100);

                return netStub;
            });

            return portPolling({
                netServerTimeoutInMS: 1000,
                useNetServer: true
            }).then(() => {
                expect(net.createServer.calledOnce).to.be.true;
                expect(netStub.listen.callCount).to.eql(1);
                expect(netStub.listen.calledWithExactly({host: 'localhost', port: 1212})).to.be.true;
                expect(netStub.close.callCount).to.eql(1);

                expect(socketStub.destroy.callCount).to.eql(1);
                expect(socketStub.on.callCount).to.eql(1);
            }).catch((err) => {
                throw err;
            });
        });

        it('Ghost didn\'t start', function () {
            const netStub = sinon.stub();
            const socketStub = sinon.stub();

            socketStub.on = sinon.stub().callsFake((event, cb) => {
                if (event === 'data') {
                    cb(JSON.stringify({false: true, error: {message: 'Syntax Error'}}));
                }
            });

            socketStub.destroy = sinon.stub();

            netStub.listen = sinon.stub();
            netStub.close = sinon.stub().callsFake((cb) => {
                cb();
            });

            sinon.stub(net, 'createServer').callsFake((fn) => {
                setTimeout(() => {
                    fn(socketStub);
                }, 100);

                return netStub;
            });

            return portPolling({
                netServerTimeoutInMS: 1000,
                useNetServer: true
            }).then(() => {
                expect('1').to.equal(1, 'Ghost should not start.');
            }).catch((err) => {
                expect(err.message).to.eql('Syntax Error');
                expect(net.createServer.calledOnce).to.be.true;
                expect(netStub.listen.calledOnce).to.be.true;
                expect(netStub.listen.calledWithExactly({host: 'localhost', port: 1212})).to.be.true;
                expect(netStub.close.callCount).to.eql(1);

                expect(socketStub.destroy.callCount).to.eql(1);
                expect(socketStub.on.callCount).to.eql(1);
            });
        });

        it('Ghost didn\'t start, invalid json', function () {
            const netStub = sinon.stub();
            const socketStub = sinon.stub();

            socketStub.on = sinon.stub().callsFake((event, cb) => {
                if (event === 'data') {
                    cb('not json');
                }
            });

            socketStub.destroy = sinon.stub();

            netStub.listen = sinon.stub();
            netStub.close = sinon.stub().callsFake((cb) => {
                cb();
            });

            sinon.stub(net, 'createServer').callsFake((fn) => {
                setTimeout(() => {
                    fn(socketStub);
                }, 100);

                return netStub;
            });

            return portPolling({
                netServerTimeoutInMS: 1000,
                useNetServer: true
            }).then(() => {
                expect('1').to.equal(1, 'Ghost should not start.');
            }).catch((err) => {
                expect(err.message).to.match(/Unexpected token/);
                expect(net.createServer.calledOnce).to.be.true;
                expect(netStub.listen.calledOnce).to.be.true;
                expect(netStub.listen.calledWithExactly({host: 'localhost', port: 1212})).to.be.true;
                expect(netStub.close.callCount).to.eql(1);

                expect(socketStub.destroy.callCount).to.eql(1);
                expect(socketStub.on.callCount).to.eql(1);
            });
        });

        it('Ghost does not communicate, expect timeout', function () {
            const netStub = sinon.stub();
            const socketStub = sinon.stub();

            socketStub.on = sinon.stub();
            socketStub.destroy = sinon.stub();

            netStub.listen = sinon.stub();
            netStub.close = sinon.stub().callsFake((cb) => {
                cb();
            });

            sinon.stub(net, 'createServer').callsFake(() => netStub);

            return portPolling({
                netServerTimeoutInMS: 500,
                useNetServer: true
            }).then(() => {
                expect('1').to.equal(1, 'Ghost should not start.');
            }).catch((err) => {
                expect(err.message).to.eql('Could not communicate with Ghost');
                expect(net.createServer.calledOnce).to.be.true;
                expect(netStub.listen.calledOnce).to.be.true;
                expect(netStub.listen.calledWithExactly({host: 'localhost', port: 1212})).to.be.true;
                expect(netStub.close.callCount).to.eql(1);

                expect(socketStub.destroy.callCount).to.eql(0);
                expect(socketStub.on.callCount).to.eql(0);
            });
        });

        it('Ghost does not answer, expect timeout', function () {
            const netStub = sinon.stub();
            const socketStub = sinon.stub();

            socketStub.on = sinon.stub();
            socketStub.destroy = sinon.stub();

            netStub.listen = sinon.stub();
            netStub.close = sinon.stub().callsFake((cb) => {
                cb();
            });

            sinon.stub(net, 'createServer').callsFake((fn) => {
                setTimeout(() => {
                    fn(socketStub);
                }, 100);

                return netStub;
            });

            return portPolling({
                netServerTimeoutInMS: 500,
                useNetServer: true
            }).then(() => {
                expect('1').to.equal(1, 'Ghost should not start.');
            }).catch((err) => {
                expect(err.message).to.eql('Could not communicate with Ghost');
                expect(net.createServer.calledOnce).to.be.true;
                expect(netStub.listen.calledOnce).to.be.true;
                expect(netStub.listen.calledWithExactly({host: 'localhost', port: 1212})).to.be.true;
                expect(netStub.close.callCount).to.eql(1);

                expect(socketStub.destroy.callCount).to.eql(1);
                expect(socketStub.on.callCount).to.eql(1);
            });
        });
    });

    describe('useNetServer is disabled', function () {
        it('Ghost does never start', function () {
            const netStub = sinon.stub();

            netStub.setTimeout = sinon.stub();
            netStub.destroy = sinon.stub();
            netStub.on = function (event, cb) {
                if (event === 'error') {
                    cb(new Error('whoops'));
                }
            };

            const connectStub = sinon.stub(net, 'connect').returns(netStub);

            return portPolling({port: 1111, maxTries: 3, retryTimeoutInMS: 100})
                .then(() => {
                    throw new Error('Expected error');
                })
                .catch((err) => {
                    expect(err.options.suggestion).to.exist;
                    expect(err.message).to.eql('Ghost did not start.');
                    expect(err.err.message).to.eql('whoops');
                    expect(connectStub.callCount).to.equal(4);
                    expect(connectStub.calledWithExactly(1111, 'localhost'), 'uses localhost by default').to.be.true;
                    expect(netStub.destroy.callCount).to.eql(4);
                });
        });

        it('Ghost does start, but falls over', function () {
            const netStub = sinon.stub();

            netStub.setTimeout = sinon.stub();
            netStub.destroy = sinon.stub();

            let i = 0;
            netStub.on = function (event, cb) {
                i = i + 1;

                if (event === 'close') {
                    cb();
                } else if (event === 'error' && i === 3) {
                    cb(new Error());
                } else if (event === 'connect' && i === 5) {
                    cb();
                }
            };

            const connectStub = sinon.stub(net, 'connect').returns(netStub);

            return portPolling({port: 1111, maxTries: 3, retryTimeoutInMS: 100, delayOnConnectInMS: 150, host: '0.0.0.0'})
                .then(() => {
                    throw new Error('Expected error');
                })
                .catch((err) => {
                    expect(err.options.suggestion).to.exist;
                    expect(err.message).to.eql('Ghost did not start.');
                    expect(err.err.message).to.eql('Ghost died.');
                    expect(connectStub.calledTwice).to.be.true;
                    expect(connectStub.calledWithExactly(1111, 'localhost'), 'uses localhost if host is 0.0.0.0').to.be.true;
                    expect(netStub.destroy.callCount).to.eql(2);
                });
        });

        it('Ghost does start', function () {
            const netStub = sinon.stub();

            netStub.setTimeout = sinon.stub();
            netStub.destroy = sinon.stub();

            let i = 0;
            netStub.on = function (event, cb) {
                i = i + 1;

                if (i === 6) {
                    expect(event).to.eql('close');
                } else if (i === 5 && event === 'connect') {
                    cb();
                } else if (i === 3 && event === 'error') {
                    cb(new Error());
                }
            };

            const connectStub = sinon.stub(net, 'connect').returns(netStub);

            return portPolling({port: 1111, maxTries: 3, retryTimeoutInMS: 100, delayOnConnectInMS: 150, host: '10.0.1.0'})
                .then(() => {
                    expect(connectStub.calledTwice).to.be.true;
                    expect(connectStub.calledWithExactly(1111, '10.0.1.0'), 'uses custom host').to.be.true;
                    expect(netStub.destroy.callCount).to.eql(2);
                })
                .catch((err) => {
                    throw err;
                });
        });

        it('Ghost does start, skip delay on connect', function () {
            const netStub = sinon.stub();

            netStub.setTimeout = sinon.stub();
            netStub.destroy = sinon.stub();

            netStub.on = function (event, cb) {
                expect(event).to.not.eql('close');

                if (event === 'connect') {
                    cb();
                }
            };

            sinon.stub(net, 'connect').returns(netStub);

            return portPolling({port: 1111, maxTries: 3, retryTimeoutInMS: 100, delayOnConnectInMS: false})
                .then(() => {
                    expect(netStub.destroy.callCount).to.eql(1);
                })
                .catch((err) => {
                    throw err;
                });
        });

        it('socket times out', function () {
            const netStub = sinon.stub();

            netStub.setTimeout = sinon.stub();
            netStub.destroy = sinon.stub();

            netStub.on = function (event, cb) {
                if (event === 'timeout') {
                    cb();
                }
            };

            sinon.stub(net, 'connect').returns(netStub);

            return portPolling({port: 1111, maxTries: 3, retryTimeoutInMS: 100, socketTimeoutInMS: 300})
                .then(() => {
                    throw new Error('Expected error');
                })
                .catch((err) => {
                    expect(err.options.suggestion).to.exist;
                    expect(err.message).to.eql('Ghost did not start.');
                    expect(err.err.message).to.eql('Socket timed out.');
                    expect(netStub.destroy.callCount).to.eql(4);
                });
        });

        it('Ghost connects, but socket times out kicks in', function () {
            const netStub = sinon.stub();

            netStub.setTimeout = sinon.stub();
            netStub.destroy = sinon.stub();

            const events = {};
            netStub.on = function (event, cb) {
                if (event === 'connect') {
                    cb();

                    setTimeout(() => {
                        events.timeout();
                    }, 100);
                }

                events[event] = cb;
            };

            sinon.stub(net, 'connect').returns(netStub);

            return portPolling({port: 1111, maxTries: 2, retryTimeoutInMS: 100, socketTimeoutInMS: 300})
                .then(() => {
                    throw new Error('Expected error');
                })
                .catch((err) => {
                    expect(err.options.suggestion).to.exist;
                    expect(err.message).to.eql('Ghost did not start.');
                    expect(err.err.message).to.eql('Socket timed out.');
                    expect(netStub.destroy.callCount).to.eql(3);
                });
        });
    });
});
