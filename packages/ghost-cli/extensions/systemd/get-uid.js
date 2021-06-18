'use strict';

const fs = require('fs');
const path = require('path');
const execa = require('execa');

/**
 * Helper function used by both the extension setup method
 * and the systemd process manager. This checks if the
 * linux ghost user has been set up. If not, the function returns null,
 * but if so, it returns the user id of the ghost user
 */
module.exports = function getUid(dir) {
    try {
        const uid = execa.shellSync('id -u ghost').stdout;
        const stat = fs.lstatSync(path.join(dir, 'content'));

        if (stat.uid.toString() !== uid) {
            // Ghost user is not the owner of this folder, return null
            return null;
        }

        return uid;
    } catch (e) {
        // CASE: the ghost user doesn't exist, hence can't be used
        // We just return null and not doing anything with the error,
        // as it would either mean, that the user doesn't exist (this
        // is exactly what we want to know), or the command is not by the OS
        return null;
    }
};
