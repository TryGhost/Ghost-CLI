'use strict';
const fs = require('fs');
const os = require('os');
const execa = require('execa');

const errors = require('../errors');

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
        if (!e.message.match(/no such user/i)) {
            throw new errors.ProcessError(e);
        }

        return false
    }

    ghostuid = parseInt(ghostuid);
    ghostgid = parseInt(ghostgid);

    return {
        uid: ghostuid,
        gid: ghostgid
    };
}

const shouldUseGhostUser = function shouldUseGhostUser(contentDir) {
    let ghostUser;

    if (os.platform() !== 'linux') {
        return false;
    }

    // get the ghost uid and gid
    try {
        ghostUser = getGhostUid();
    } catch (e) {
        throw e;
    }

    if (!ghostUser) {
        return false;
    }

    const stats = fs.lstatSync(contentDir);

    if (stats.uid !== ghostUser.uid && stats.gid !== ghostUser.gid) {
        return false;
    }

    return process.getuid() !== ghostUser.uid;
}

module.exports = {
    getGhostUid: getGhostUid,
    shouldUseGhostUser: shouldUseGhostUser
}
