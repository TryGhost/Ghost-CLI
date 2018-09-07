'use strict';
const sysinfo = require('systeminformation');
const SystemError = require('../../../errors').SystemError;

const MB_IN_BYTES = 1048576;
const MIN_MEMORY = 150;

function checkMemory() {
    return sysinfo.mem().then((memoryInfo) => {
        const availableMemory = memoryInfo.available / MB_IN_BYTES;

        if (availableMemory < MIN_MEMORY) {
            return Promise.reject(new SystemError(`You are recommended to have at least ${MIN_MEMORY} MB of memory available for smooth operation. It looks like you have ~${parseInt(availableMemory)} MB available.`));
        }
        return Promise.resolve();
    });
}

module.exports = {
    title: 'Checking memory availability',
    task: checkMemory,
    enabled: ctx => ctx.argv['check-mem'] === true,
    category: ['install', 'start', 'update']
};
