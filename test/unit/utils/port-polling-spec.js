'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const net = require('net');

const portPolling = require('../../../lib/utils/port-polling');

describe('Unit: Utils > portPolling', function () {
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

        return portPolling({port: 1111, maxTries: 3, timeoutInMS: 100})
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

        return portPolling({port: 1111, maxTries: 3, timeoutInMS: 100, delayOnConnectInMS: 150, host: '0.0.0.0'})
            .then(() => {
                throw new Error('Expected error');
            })
            .catch((err) => {
                expect(err.options.suggestion).to.exist;
                expect(err.message).to.eql('Ghost did not start.');
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

        return portPolling({port: 1111, maxTries: 3, timeoutInMS: 100, delayOnConnectInMS: 150, host: '10.0.1.0'})
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

        return portPolling({port: 1111, maxTries: 3, timeoutInMS: 100, delayOnConnectInMS: false})
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

        return portPolling({port: 1111, maxTries: 3, timeoutInMS: 100, socketTimeoutInMS: 300})
            .then(() => {
                throw new Error('Expected error');
            })
            .catch((err) => {
                expect(err.options.suggestion).to.exist;
                expect(err.message).to.eql('Ghost did not start.');
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

        return portPolling({port: 1111, maxTries: 2, timeoutInMS: 100, socketTimeoutInMS: 300})
            .then(() => {
                throw new Error('Expected error');
            })
            .catch((err) => {
                expect(err.options.suggestion).to.exist;
                expect(err.message).to.eql('Ghost did not start.');
                expect(netStub.destroy.callCount).to.eql(3);
            });
    });
});
