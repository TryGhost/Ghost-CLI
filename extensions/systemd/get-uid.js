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
        let uid = execa.shellSync('id -u ghost').stdout;
        let stat = fs.lstatSync(path.join(dir, 'content'));

        if (stat.uid.toString() !== uid) {
            // Ghost user is not the owner of this folder, return null
            return null;
        }

        return uid;
    } catch (e) {
        if (!e.message.match(/no such user/)) {
            throw e;
        }

        return null;
    }
};
