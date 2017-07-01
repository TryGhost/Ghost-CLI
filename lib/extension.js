'use strict';
const fs = require('fs-extra');
const path = require('path');
const mapValues = require('lodash/mapValues');

class Extension {
    constructor(ui, system, pkg, dir) {
        this.ui = ui;
        this.system = system;
        this.pkg = pkg;
        this.dir = dir;
    }

    get processManagers() {
        if (!this.pkg || !this.pkg['ghost-cli'] || !this.pkg['ghost-cli']['process-managers']) {
            return {};
        }

        return mapValues(this.pkg['ghost-cli']['process-managers'], (relPath) => {
            return path.join(this.dir, relPath);
        });
    }

    static getInstance(ui, system, extension) {
        let pkg = extension.pkg;
        let dir = extension.dir;

        if (pkg.main) {
            if (!fs.existsSync(path.join(dir, pkg.main))) {
                ui.log(`Extension '${pkg.name}' has a main entry, but no such file exists`, 'yellow');
                return;
            }

            let ExtensionSubclass = require(path.join(dir, path.basename(pkg.main, '.js')));

            if (!ExtensionSubclass || !(ExtensionSubclass.prototype instanceof Extension)) {
                ui.log(`Extension '${pkg.name}' supplied a main file, but it is not a valid Extension subclass`, 'yellow');
                return;
            }

            return new ExtensionSubclass(ui, system, pkg, dir);
        }

        return new this(ui, system, pkg, dir);
    }
}

module.exports = Extension;
