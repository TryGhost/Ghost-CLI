'use strict';
const os = require('os');
const path = require('path');
const Config = require('./utils/config');

class Instance {
    /**
     * Local config (.ghost-cli)
     */
    get cliConfig() {
        if (!this._cliConfig) {
            this._cliConfig = new Config(path.join(this.dir, '.ghost-cli'));
        }

        return this._cliConfig;
    }

    get name() {
        return this.cliConfig.get('name') || this.config.get('pname');
    }
    set name(value) {
        this.cliConfig.set('name', value).save();
        return true;
    }

    // TODO: extend to support process manager run check
    get running() {
        return this.cliConfig.has('running');
    }
    set running(environment) {
        this.cliConfig.set('running', environment).save();
        return true;
    }

    constructor(ui, system, dir) {
        this.ui = ui;
        this.system = system;
        this.dir = dir;
    }

    loadConfig(skipEnvCheck) {
        // If we are starting in production mode but a development config exists and a production config doesn't,
        // we want to start in development mode anyways.
        if (
            !skipEnvCheck && this.system.production &&
            Config.exists(path.join(this.dir, 'config.development.json')) &&
            !Config.exists(path.join(this.dir, 'config.production.json'))
        ) {
            this.ui.log('Found a development config but not a production config, running in development mode instead', 'yellow');
            this.system.setEnvironment(true, true);
        }
        this.config = new Config(path.join(this.dir, `config.${this.system.environment}.json`));
        this.loadProcess();
    }

    loadRunningConfig(setEnv, setNodeEnv) {
        if (!this.running) {
            throw new Error('This instance is not running.');
        }

        let env = this.cliConfig.get('running');
        if (setEnv) {
            this.system.setEnvironment(env === 'development', setNodeEnv);
        }

        this.config = new Config(path.join(this.dir, `config.${env}.json`));
        this.loadProcess();
        return env;
    }

    loadProcess() {
        let name = this.config.get('process', 'local');
        let manager = this.system.getProcessManager(name);
        this.process = new manager.Class(this.ui, this.system, this);
        this.processName = manager.name;
    }

    summary() {
        if (!this.running) {
            return {
                name: this.name,
                dir: this.dir.replace(os.homedir(), '~'),
                version: this.cliConfig.get('active-version'),
                running: false
            };
        }

        let env = this.loadRunningConfig();

        return {
            name: this.name,
            dir: this.dir.replace(os.homedir(), '~'),
            running: true,
            version: this.cliConfig.get('active-version'),
            mode: env,
            url: this.config.get('url'),
            port: this.config.get('server.port'),
            process: this.processName
        };
    }
}

module.exports = Instance;
