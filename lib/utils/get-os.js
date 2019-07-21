'use strict';

const os = require('os');
const execa = require('execa');

module.exports = function getOS(platform) {
    const osInfo = {
        os: os.platform(),
        version: os.release()
    };
    const opts = {shell: true};

    if (platform.linux) {
        try {
            osInfo.os = execa.sync('lsb_release -i -s', opts).stdout;
            osInfo.version = execa.sync('lsb_release -r -s', opts).stdout;
        } catch (e) {
            return osInfo;
        }
    } else if (platform.macos) {
        // Darwin is Mac OS, use `sw_vers`
        try {
            osInfo.os = execa.sync('sw_vers -productName', opts).stdout;
            osInfo.version = execa.sync('sw_vers -productVersion', opts).stdout;
        } catch (e) {
            return osInfo;
        }
    } else if (platform.windows) {
        // for windows run `ver`
        // should output something like this: Microsoft Windows XP [Version 5.1.2600]
        try {
            const winOutput = execa.sync('ver', opts).stdout.split(/\[/i);

            osInfo.os = winOutput[0].trim();
            osInfo.version = /[0-9]+\.[0-9]+\.[0-9]+/.exec(winOutput[1])[0];
        } catch (e) {
            return osInfo;
        }
    }

    return osInfo;
};
