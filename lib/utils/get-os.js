'use strict';

const os = require('os');
const execa = require('execa');

module.exports = function getOS(platform) {
    const osInfo = {
        os: os.platform(),
        version: os.release()
    };

    if (platform.linux) {
        try {
            osInfo.os = execa.shellSync('lsb_release -i -s').stdout;
            osInfo.version = execa.shellSync('lsb_release -r -s').stdout;
        } catch (e) {
            return osInfo;
        }
    } else if (platform.macos) {
        // Darwin is Mac OS, use `sw_vers`
        try {
            osInfo.os = execa.shellSync('sw_vers -productName').stdout;
            osInfo.version = execa.shellSync('sw_vers -productVersion').stdout;
        } catch (e) {
            return osInfo;
        }
    } else if (platform.windows) {
        // for windows run `ver`
        // should output something like this: Microsoft Windows XP [Version 5.1.2600]
        try {
            const winOutput = execa.shellSync('ver').stdout.split(/\[/i);

            osInfo.os = winOutput[0].trim();
            osInfo.version = /[0-9]+\.[0-9]+\.[0-9]+/.exec(winOutput[1])[0];
        } catch (e) {
            return osInfo;
        }
    }

    return osInfo;
};
