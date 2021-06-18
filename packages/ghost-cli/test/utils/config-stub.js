'use strict';
const sinon = require('sinon');

module.exports = function createConfigStub() {
    const getStub = sinon.stub();
    const setStub = sinon.stub();
    const hasStub = sinon.stub();
    const saveStub = sinon.stub();

    const config = {get: getStub, set: setStub, has: hasStub, save: saveStub};
    setStub.returns(config);

    return config;
};
