'use strict';
const os = require('os');
const SystemError = require('../../../errors').SystemError;

const MB_IN_BYTES = 1048576;
const MIN_MEMORY = 150;

function checkMemory() {
    const availableMemory = os.freemem() / MB_IN_BYTES;
    if (availableMemory < MIN_MEMORY) {
        return Promise.reject(new SystemError(`Ghost recommends you have at least ${MIN_MEMORY} MB of memory available for smooth operation. It looks like you have ${parseInt(availableMemory)} MB available.`));
    }
    return Promise.resolve();
}

module.exports = {
    title: 'Checking memory availability',
    task: checkMemory,
    category: ['install', 'start', 'update']
};
