'use strict';
const fs = require('fs');
const os = require('os');
const execa = require('execa');

const getGhostUid = function getGhostUid() {
    if (os.platform() !== 'linux') {
        return false;
    }

    let ghostuid, ghostgid;

    try {
        ghostuid = execa.shellSync('id -u ghost').stdout;
        ghostgid = execa.shellSync('id -g ghost').stdout;
    } catch (e) {
        // CASE: the ghost user doesn't exist, hence can't be used
        // We just return false and not doing anything with the error,
        // as it would either mean, that the user doesn't exist (this
        // is exactly what we want), or the command is not known on a
        // Linux system.
        return false;
    }

    ghostuid = parseInt(ghostuid);
    ghostgid = parseInt(ghostgid);

    return {
        uid: ghostuid,
        gid: ghostgid
    };
};

const shouldUseGhostUser = function shouldUseGhostUser(contentDir) {
    if (os.platform() !== 'linux') {
        return false;
    }

    // get the ghost uid and gid
    const ghostUser = getGhostUid();

    if (!ghostUser) {
        return false;
    }

    const stats = fs.lstatSync(contentDir);

    if (stats.uid !== ghostUser.uid && stats.gid !== ghostUser.gid) {
        return false;
    }

    return process.getuid() !== ghostUser.uid;
};

module.exports = {
    getGhostUid: getGhostUid,
    shouldUseGhostUser: shouldUseGhostUser
};
