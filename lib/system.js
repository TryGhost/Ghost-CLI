'use strict';
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const findKey = require('lodash/findKey');
const uniqueId = require('lodash/uniqueId');
const each = require('lodash/each');
const some = require('lodash/some');
const Promise = require('bluebird');

const Config = require('./utils/config');
const Instance = require('./instance');
const Extension = require('./extension');
const ProcessManager = require('./process-manager');

/**
 * System class. Responsible for managing the environment of a running CLI
 * process, as well as all of the various CLI instances on a system
 *
 * @class System
 */
class System {
    /**
     * UI Instance
     * @property ui
     * @type UI
     * @public
     */

    get platform() {
        if (!this._platform) {
            const platform = os.platform();

            this._platform = {
                linux: platform === 'linux',
                macos: platform === 'darwin',
                windows: platform === 'win32'
            };
        }

        return this._platform;
    }

    /**
     * Version of the CLI
     *
     * @property cliVersion
     * @type string
     * @public
     */
    get cliVersion() {
        if (!this._version) {
            this._version = require('../package.json').version;
        }

        return this._version;
    }

    /**
     * Global config (lives at ~/.ghost/config). This config is primarily
     * responsible for storing all of the Ghost instances on a particular system.
     *
     * @property globalConfig
     * @type Config
     * @public
     */
    get globalConfig() {
        if (!this._globalConfig) {
            fs.ensureDirSync(this.constructor.globalDir);
            this._globalConfig = new Config(path.join(this.constructor.globalDir, 'config'));
        }

        return this._globalConfig;
    }

    /**
     * Returns the running operating system
     *
     * @property operatingSystem
     * @type Object
     * @public
     */
    get operatingSystem() {
        if (!this._operatingSystem) {
            const getOS = require('./utils/get-os');
            this._operatingSystem = getOS(this.platform);

            return this._operatingSystem;
        }

        return this._operatingSystem;
    }

    /**
     * Constructs the System class
     *
     * @param {UI} UI instance
     * @param {Array<Object>} Array of loaded extensions
     */
    constructor(ui, extensions) {
        this.ui = ui;

        this._instanceCache = {};
        this._extensions = extensions.map(Extension.getInstance.bind(Extension, ui, this)).filter(Boolean);
    }

    /**
     * Sets the environment of the CLI running process
     *
     * @param {Boolean} isDevelopmentMode Set this to true for development
     * @param {Boolean} setNodeEnv Whether or not to set the NODE_ENV variable
     * @method setEnvironment
     * @public
     */
    setEnvironment(isDevelopmentMode, setNodeEnv) {
        this.environment = isDevelopmentMode ? 'development' : 'production';
        this.development = isDevelopmentMode;
        this.production = !isDevelopmentMode;

        if (setNodeEnv) {
            process.env.NODE_ENV = this.environment;
        }
    }

    /**
     * Returns an instance by name, or the instance of the current
     * working directory
     *
     * @param {string} Optional name of instance to retrieve
     * @return {Instance}
     * @method getInstance
     * @public
     */
    getInstance(name) {
        if (!name) {
            return this.cachedInstance(process.cwd());
        }

        const instance = this.globalConfig.get(`instances.${name}`);
        if (!instance) {
            return null;
        }

        return this.cachedInstance(instance.cwd);
    }

    /**
     * Adds an instance to the global instance list. Also
     * de-duplicates the process name
     *
     * @param {Instance} Instance to add
     * @method addInstance
     * @public
     */
    addInstance(instance) {
        const instances = this.globalConfig.get('instances', {});
        const existingInstance = findKey(instances, cfg => cfg.cwd === instance.dir);

        if (existingInstance) {
            instance.name = existingInstance;
            return;
        }

        let currentName = instance.name;
        const existingNames = Object.keys(instances);
        // Loop through the names, incrementing it by 1 each time until
        // we hit one that doesn't already exist
        while (existingNames.includes(currentName)) {
            currentName = uniqueId(currentName.match(/-\d+$/) ? currentName.replace(/-\d+$/, '-') : `${currentName}-`);
        }

        // Only change the instance name if we ended up needing to de-duplicate
        if (currentName !== instance.name) {
            instance.name = currentName;
        }

        this.globalConfig.set(`instances.${currentName}`, {cwd: instance.dir}).save();
    }

    /**
     * Remove an instance from the global instance list.
     *
     * @param {Instance} Instance to remove
     * @method removeInstance
     * @public
     */
    removeInstance(instance) {
        const instances = this.globalConfig.get('instances', {});
        delete instances[instance.name];
        this.globalConfig.set('instances', instances).save();
    }

    /**
     * Checks whether or not the system knows about an instance
     * @param {Instance} instance
     */
    hasInstance(instance) {
        const instances = this.globalConfig.get('instances', {});
        return some(instances, ({cwd}, name) => cwd === instance.dir && name === instance.name);
    }

    /**
     * Gets an instance from cache. Populates cache with new instance if none found
     *
     * @param {string} dir
     * @param {Boolean} skipEnvCheck
     * @method cachedInstance
     * @private
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
     * @return {Promise<Instance>} instances
     * @method getAllInstances
     * @public
     */
    getAllInstances(running) {
        const instances = this.globalConfig.get('instances', {});
        const names = Object.keys(instances);

        const namesToRemove = [];

        // Remove nonexistent instances
        const result = names.map((name) => {
            if (!fs.existsSync(path.join(instances[name].cwd, '.ghost-cli'))) {
                namesToRemove.push(name);
                return null;
            }

            return this.getInstance(name);
        }).filter(Boolean);

        if (namesToRemove.length) {
            namesToRemove.forEach(name => delete instances[name]);
            this.globalConfig.set('instances', instances).save();
        }

        // If we're not filtering out stopped instances, just return the result
        if (!running) {
            return Promise.resolve(result);
        }

        // Return the result filtered by whether or not the instance is running
        return Promise.filter(result, instance => instance.running());
    }

    /**
     * Calls a hook on any loaded extensions. Internal, used by CLI commands
     *
     * @param {string} hookName name of hook to call
     * @param {...any} Arguments to pass to the hook
     * @return {Promise<void>} Promise that resolves after the hook has been called
     *                         on each of the extensions
     * @method hook
     * @private
     */
    hook() {
        const args = Array.from(arguments);
        const hookName = args.shift();

        if (!hookName) {
            return Promise.reject(new Error('Hook name must be supplied.'));
        }

        return Promise.mapSeries(this._extensions, (extension) => {
            if (!extension[hookName]) {
                return Promise.resolve();
            }

            return Promise.resolve(extension[hookName].apply(extension, args));
        });
    }

    /**
     * Get the process manager by name. Process manager classes can come
     * from any one of the loaded extensions. If no process manager is found for
     * the given name or the located process manager is invalid, the local
     * process manager is returned
     *
     * @param {string} name Name of the process manager
     * @return {Object} Object with two properties
     *  - Class: Class of the process manager
     *  - Name: Name of the process manager as given by the extension
     * @method getProcessManager
     * @public
     */
    getProcessManager(name) {
        if (!name || name === 'local') {
            return {Class: require('./utils/local-process'), name: 'local'};
        }

        const availableProcessManagers = this._getAvailableProcessManagers();

        if (!availableProcessManagers[name]) {
            this.ui.log(`Process manager '${name}' does not exist, defaulting to 'local'`, 'yellow');
            return {Class: require('./utils/local-process'), name: 'local'};
        }

        const Klass = require(availableProcessManagers[name]);
        const valid = ProcessManager.isValid(Klass);

        if (valid !== true) {
            const msg = valid !== false ? `missing required fields: ${valid.join(', ')}` : 'does not inherit from base class';
            this.ui.log(`Process manager '${name}' ${msg}, defaulting to 'local'`, 'yellow');
            return {Class: require('./utils/local-process'), name: 'local'};
        }

        if (!Klass.willRun()) {
            this.ui.log(`Process manager '${name}' will not run on this system, defaulting to 'local'`, 'yellow');
            return {Class: require('./utils/local-process'), name: 'local'};
        }

        return {Class: Klass, name: name};
    }

    /**
     * Gets a list of the available process managers from all of the extensions
     *
     * @return {Object} hash of all process managers indexed by name
     * @method _getAvailableProcessManagers
     * @private
     */
    _getAvailableProcessManagers() {
        const available = {};

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
     * @param {string} error Error to write to log file
     * @return {string} path to generated log file
     * @method writeErrorLog
     * @public
     */
    writeErrorLog(error) {
        // Ensure logs dir exists
        fs.ensureDirSync(path.join(this.constructor.globalDir, 'logs'));

        const date = new Date();
        const logFilePath = path.join(this.constructor.globalDir, 'logs', `ghost-cli-debug-${date.toISOString().replace(/:|\./g, '_')}.log`);
        fs.writeFileSync(logFilePath, error);

        return logFilePath;
    }

    /**
     * @static
     * @property globalDir
     * @type string
     * @private
     */
}

System.globalDir = path.join(os.homedir(), '.ghost');

module.exports = System;
