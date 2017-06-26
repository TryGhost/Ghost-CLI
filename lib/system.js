'use strict';
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const uniqueId = require('lodash/uniqueId');
const map = require('lodash/map');

const pkg = require('../package.json');
const errors = require('./errors');
const Config = require('./utils/config');

class System {
    /**
     * Version of the CLI
     */
    get cliVersion() {
        return pkg.version;
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

    constructor(ui, localDir) {
        this.ui = ui;

        if (localDir) {
            this.loadLocalConfig(localDir);
        }
    }

    loadDir(dir, setProcessEnv) {
        this.loadLocalConfig(dir);
        this.loadEnvironmentFromRunningConfig(setProcessEnv);
        this.loadInstanceConfig();
    }

    loadLocalConfig(dir) {
        if (!fs.existsSync(dir)) {
            throw new errors.SystemError('Instance directory does not exist.');
        }

        this.instanceDir = dir;
        this.localConfig = new Config(path.join(this.instanceDir, '.ghost-cli'));
    }

    loadEnvironment(isDevelopmentMode, setProcessEnv) {
        this.mode = isDevelopmentMode ? 'development' : 'production';
        this.development = isDevelopmentMode;
        this.production = !isDevelopmentMode;

        if (setProcessEnv) {
            process.env.NODE_ENV = this.mode;
        }
    }

    loadEnvironmentFromRunningConfig(setProcessEnv) {
        if (!this.localConfig) {
            throw new errors.SystemError('Local config not loaded');
        }

        if (this.localConfig.has('running')) {
            this.loadEnvironment(this.localConfig.get('running'), setProcessEnv);
        }
    }

    loadInstanceConfig(reload) {
        if (this.instanceConfig && !reload) {
            return;
        }

        if (!this.instanceDir) {
            throw new errors.SystemError('Instance directory must be set.');
        }

        // If we are starting in production mode but a development config exists and a production config doesn't,
        // we want to start in development mode anyways.
        if (
            this.production &&
            Config.exists(path.join(this.instanceDir, 'config.development.json')) &&
            !Config.exists(path.join(this.instanceDir, 'config.production.json'))
        ) {
            this.ui.log('Found a development config but not a production config, running in development mode instead', 'yellow');
            this.loadEnvironment(true, true);
        }

        this.instanceConfig = new Config(path.join(this.instanceDir, `config.${ this.mode }.json`));
    }

    dedupeInstanceName() {
        if (!this.instanceConfig) {
            throw new errors.SystemError('Instance config not loaded');
        }

        let currentName = this.instanceConfig.get('pname', 'ghost');
        let instances = this.globalConfig.get('instances', {});

        if (instances[currentName] && instances[currentName].cwd === this.instanceDir) {
            return;
        }

        let existingNames = Object.keys(instances);
        while (existingNames.includes(currentName)) {
            currentName = uniqueId(currentName.match(/\-\d+$/) ? currentName.replace(/-\d+$/, '-') : `${ currentName }-`);
        }

        if (currentName !== this.instanceConfig.get('pname')) {
            this.instanceConfig.set('pname', currentName).save();
        }

        return currentName;
    }

    addInstance() {
        if (!this.instanceConfig) {
            throw new errors.SystemError('Instance config not loaded');
        }

        let instances = this.globalConfig.get('instances', {});
        let instanceName = this.instanceConfig.get('pname', 'ghost');

        if (instances[instanceName]) {
            if (instances[instanceName].cwd === this.instanceDir) {
                return;
            }

            instanceName = this.dedupeInstanceName();
        }

        instances[instanceName] = {
            cwd: this.instanceDir
        };

        this.globalConfig.set('instances', instances).save();
    }

    summary() {
        if (!this.localConfig) {
            return null;
        }

        if (!this.localConfig.has('running')) {
            return {
                name: this.localConfig.get('name'),
                dir: this.instanceDir.replace(os.homedir(), '~'),
                version: this.localConfig.get('active-version'),
                running: false
            };
        }

        this.loadEnvironmentFromRunningConfig();
        this.loadInstanceConfig(true);

        return {
            name: this.instanceConfig.get('pname'),
            dir: this.instanceDir.replace(os.homedir(), '~'),
            running: true,
            version: this.localConfig.get('active-version'),
            mode: this.mode,
            url: this.instanceConfig.get('url'),
            port: this.instanceConfig.get('server.port'),
            process: this.instanceConfig.get('process')
        }
    }

    getInstanceList() {
        let instances = this.globalConfig.get('instances', {});

        return map(instances, (instance) => {
            let system = new this.constructor(this.ui, instance.cwd);
            return system.summary();
        }).filter(Boolean);
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
        let logFilePath = path.join(this.constructor.globalDir, 'logs', `ghost-cli-debug-${ date.toISOString() }.log`);
        fs.writeFileSync(logFilePath, error);

        return logFilePath;
    }
}

System.globalDir = path.join(os.homedir(), '.ghost');

module.exports = System;
