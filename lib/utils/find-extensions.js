'use strict';
const fs = require('fs');
const path = require('path');
const findPlugins = require('find-plugins');
const createDebug = require('debug');

const debug = createDebug('ghost-cli:find-extensions');

const localExtensions = [
    'mysql',
    'nginx',
    'systemd'
].map(local => path.join(__dirname, '..', '..', 'extensions', local));

/**
 * Finds available extensions in the system. Checks both the local CLI install
 * (for internal extensions) as well as the npm root, as determined by `npm root -g`
 *
 * @return Array array containing the package.json and dir of any found extensions
 */
module.exports = function findExtensions() {
    const npmRoot = require('global-modules');
    debug(`searching for extensions in ${npmRoot}`);

    return findPlugins({
        keyword: 'ghost-cli-extension',
        configName: 'ghost-cli',
        include: localExtensions,
        dir: fs.existsSync(npmRoot) ? npmRoot : process.cwd(),
        scanAllDirs: true,
        sort: true
    }).map((ext) => {
        // We do some additional stuff here to make it easier to
        // use this in other places
        if (ext.pkg['ghost-cli']) {
            ext.config = ext.pkg['ghost-cli'];
        }

        // Get the name from either the `ghost-cli` config property, or the
        // name of the package
        ext.name = (ext.config && ext.config.name) || ext.pkg.name;

        return ext;
    });
};
