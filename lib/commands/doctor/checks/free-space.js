const sysinfo = require('systeminformation');
const {SystemError} = require('../../../errors');

const MB_IN_BYTES = 1048576;

// one version of Ghost takes ~400mb of space currently, to be safe we're going to say 1gb
const MIN_FREE_SPACE = 1024;

async function checkFreeSpace(ctx) {
    const dir = ctx.instance ? ctx.instance.dir : process.cwd();

    const disks = await sysinfo.fsSize();

    // filter out disks with matching mount points, then sort in descending order by mount point length
    // to get the mount point with greatest specificity
    const [disk] = disks.filter(d => dir.startsWith(d.mount)).sort((a, b) => b.mount.length - a.mount.length);

    if (!disk) {
        // couldn't find a matching disk, early return
        // TODO: maybe throw a warning of some sort here?
        return;
    }

    const available = (disk.size - disk.used) / MB_IN_BYTES;
    if (available < MIN_FREE_SPACE) {
        throw new SystemError(`You are recommended to have at least ${MIN_FREE_SPACE} MB of free storage space available for smooth operation. It looks like you have ~${available} MB available`);
    }
}

module.exports = {
    title: 'Checking free space',
    task: checkFreeSpace,
    category: ['install', 'update']
};
