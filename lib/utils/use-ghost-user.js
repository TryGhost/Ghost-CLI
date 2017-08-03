'use strict';
const fs = require('fs');
const os = require('os');
const execa = require('execa');

const errors = require('../errors');

module.exports = function useGhostUser(contentDir) {
    if (os.platform() !== 'linux') {
        return false;
    }

    let ghostuid, ghostgid;

    try {
        ghostuid = execa.shellSync('id -u ghost').stdout;
        ghostgid = execa.shellSync('id -g ghost').stdout;
    } catch (e) {
        if (!e.message.match(/no such user/i)) {
            throw new errors.ProcessError(e);
        }

        return false;
    }

    ghostuid = parseInt(ghostuid);
    ghostgid = parseInt(ghostgid);

    let stats = fs.lstatSync(contentDir);

    if (stats.uid !== ghostuid && stats.gid !== ghostgid) {
        return false;
    }

    return process.getuid() !== ghostuid;
}
