const sysinfo = require('systeminformation');
const {SystemError} = require('../../../errors');

const MB_IN_BYTES = 1048576;
const MIN_MEMORY = 150;

async function checkMemory() {
    const {available, swapfree} = await sysinfo.mem();
    const availableMemory = (available + swapfree) / MB_IN_BYTES;

    if (availableMemory < MIN_MEMORY) {
        throw new SystemError(`You are recommended to have at least ${MIN_MEMORY} MB of memory available for smooth operation. It looks like you have ~${availableMemory} MB available.`);
    }
}

module.exports = {
    title: 'Checking memory availability',
    task: checkMemory,
    enabled: ctx => ctx.argv['check-mem'] === true,
    category: ['install', 'start', 'update']
};
