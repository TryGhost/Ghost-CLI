'use strict';
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const findKey = require('lodash/findKey');
const uniqueId = require('lodash/uniqueId');
const includes = require('lodash/includes');
const each = require('lodash/each');
const Promise = require('bluebird');

const Config = require('./utils/config');
const Instance = require('./instance');
const Extension = require('./extension');
const ProcessManager = require('./process-manager');

class System {
    /**
     * Version of the CLI
     */
    get cliVersion() {
        return require('../package.json').version;
    }

    /**
     * Global config (lives at ~/.ghost/config)
     * Make this a getter so it's not called unless necessary
     */
    get globalConfig() {
        if (!this._globalConfig) {
            fs.ensureDirSync(this.constructor.globalDir);
            this._globalConfig = new Config(path.join(this.constructor.globalDir, 'config'));
        }

        return this._globalConfig;
    }

    constructor(ui, extensions) {
        this.ui = ui;

        this._instanceCache = {};
        this._extensions = extensions.map(Extension.getInstance.bind(Extension, ui, this)).filter(Boolean);
    }

    setEnvironment(isDevelopmentMode, setNodeEnv) {
        this.environment = isDevelopmentMode ? 'development' : 'production';
        this.development = isDevelopmentMode;
        this.production = !isDevelopmentMode;

        if (setNodeEnv) {
            process.env.NODE_ENV = this.environment;
        }
    }

    getInstance(name) {
        if (!name) {
            return this.cachedInstance(process.cwd());
        }

        let instance = this.globalConfig.get(`instances.${name}`);
        if (!instance) {
            return null;
        }

        return this.cachedInstance(instance.cwd);
    }

    addInstance(instance) {
        let instances = this.globalConfig.get('instances', {});
        let existingInstance = findKey(instances, (cfg) => {
            return cfg.cwd === instance.dir;
        });

        if (existingInstance) {
            instance.name = existingInstance;
            return;
        }

        let currentName = instance.name;
        let existingNames = Object.keys(instances);
        while (includes(existingNames, currentName)) {
            currentName = uniqueId(currentName.match(/\-\d+$/) ? currentName.replace(/-\d+$/, '-') : `${ currentName }-`);
        }

        if (currentName !== instance.name) {
            instance.name = currentName;
        }

        this.globalConfig.set(`instances.${currentName}`, {cwd: instance.dir}).save();
    }

    removeInstance(instance) {
        let instances = this.globalConfig.get('instances', {});
        delete instances[instance.name];
        this.globalConfig.set('instances', instances).save();
    }

    /**
     * Gets an instance from cache. Populates cache with new instance if none found
     *
     * @param {String} dir
     * @param {Boolean} skipEnvCheck
     */
    cachedInstance(dir) {
        if (!this._instanceCache[dir]) {
            this._instanceCache[dir] = new Instance(this.ui, this, dir);
        }

        return this._instanceCache[dir];
    }

    /**
     * Gets all listed instances. If running is true, returns only running instances
     * Also removes any instances that no longer exist
     *
     * @param {Boolean} running If true, returns only running instances
     */
    getAllInstances(running) {
        let instances = this.globalConfig.get('instances', {});
        let names = Object.keys(instances);

        let namesToRemove = [];

        // Remove nonexistent instances
        let result = names.map((name) => {
            if (!fs.existsSync(path.join(instances[name].cwd, '.ghost-cli'))) {
                namesToRemove.push(name);
                return null;
            }

            return this.getInstance(name);
        }).filter((instance) => instance && (!running || instance.running));

        if (namesToRemove.length) {
            namesToRemove.forEach((name) => delete instances[name]);
            this.globalConfig.set('instances', instances).save();
        }

        return result;
    }

    hook() {
        let args = Array.from(arguments);
        let hookName = args.shift();

        if (!hookName) {
            return Promise.reject(new Error('Hook name must be supplied.'));
        }

        return Promise.each(this._extensions, (extension) => {
            if (!extension[hookName]) {
                return Promise.resolve();
            }

            return Promise.resolve(extension[hookName].apply(extension, args));
        });
    }

    getProcessManager(name) {
        if (!name || name === 'local') {
            return { Class: require('./utils/local-process'), name: 'local' };
        }

        let availableProcessManagers = this._getAvailableProcessManagers();

        if (!availableProcessManagers[name]) {
            this.ui.log(`Process manager '${name}' does not exist, defaulting to 'local'`, 'yellow');
            return { Class: require('./utils/local-process'), name: 'local' };
        }

        let Klass = require(availableProcessManagers[name]);
        let valid = ProcessManager.isValid(Klass);

        if (valid !== true) {
            let msg = valid !== false ? `missing required fields: ${valid.join(', ')}` : 'does not inherit from base class';
            this.ui.log(`Process manager '${name}' ${msg}, defaulting to 'local'`, 'yellow');
            return { Class: require('./utils/local-process'), name: 'local' };
        }

        if (!Klass.willRun()) {
            this.ui.log(`Process manager '${name}' will not run on this system, defaulting to 'local'`, 'yellow');
            return { Class: require('./utils/local-process'), name: 'local' };
        }

        return { Class: Klass, name: name };
    }

    _getAvailableProcessManagers() {
        let available = {};

        this._extensions.forEach((ext) => {
            each(ext.processManagers, (pm, name) => {
                if (!fs.existsSync(pm)) {
                    return;
                }

                available[name] = pm;
            });
        });

        return available;
    }

    /**
     * Writes an error message to a global log file.
     *
     * @param {String} error Error to write to log file
     */
    writeErrorLog(error) {
        // Ensure logs dir exists
        fs.ensureDirSync(path.join(this.constructor.globalDir, 'logs'));

        let date = new Date();
        let logFilePath = path.join(this.constructor.globalDir, 'logs', `ghost-cli-debug-${ date.toISOString().replace(/:|\./g, '_') }.log`);
        fs.writeFileSync(logFilePath, error);

        return logFilePath;
    }
}

System.globalDir = path.join(os.homedir(), '.ghost');

module.exports = System;
