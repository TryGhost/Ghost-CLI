'use strict';
const path = require('path');
const findPlugins = require('find-plugins');
const createDebug = require('debug');
const execa = require('execa');

const debug = createDebug('ghost-cli:find-extensions');

const localExtensions = [
    'linux',
    'nginx',
    'mysql',
    'systemd'
].map((local) => path.join(__dirname, '..', '..', 'extensions', local));

module.exports = function findExtensions() {
    let npmRoot = execa.shellSync('npm root -g').stdout;
    debug('searching for extensions');

    return findPlugins({
        keyword: 'ghost-cli-extension',
        configName: 'ghost-cli',
        include: localExtensions,
        modulesDir: npmRoot,
        scanAllDirs: true,
        sort: true
    }).map((ext) => {
        if (ext.pkg['ghost-cli']) {
            ext.config = ext.pkg['ghost-cli'];
        }

        ext.name = (ext.config && ext.config.name) || ext.pkg.name;

        return ext;
    });
}
