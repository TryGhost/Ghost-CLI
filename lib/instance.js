'use strict';
const os = require('os');
const path = require('path');
const Config = require('./utils/config');

/**
 * Class for managing the various instance-specific
 * concerns
 *
 * @class System
 */
class Instance {
    /**
     * Process name (makes the instance identifiable on the system)
     *
     * @property name
     * @type string
     * @public
     */
    get name() {
        return this._cliConfig.get('name') || this.config.get('pname');
    }
    set name(value) {
        this._cliConfig.set('name', value).save();
        return true;
    }

    /**
     * Environment-specific configuration file (contains Ghost-specific variables)
     *
     * @property config
     * @type Config
     * @public
     */
    get config() {
        const currentEnv = this.system.environment;

        if (!this._config || this._config.environment !== currentEnv) {
            this._config = new Config(path.join(this.dir, `config.${this.system.environment}.json`));
            this._config.environment = this.system.environment;
        }

        return this._config;
    }

    /**
     * Process manager for this instance & environment
     *
     * @property process
     * @type ProcessManager
     * @public
     */
    get process() {
        const name = this.config.get('process', 'local');

        if (!this._process || name !== this._process.name) {
            const manager = this.system.getProcessManager(name);
            this._process = new manager.Class(this.ui, this.system, this);
            this._process.name = name;
        }

        return this._process;
    }

    /**
     * Instance version
     *
     * @property version
     * @type string
     * @public
     */
    get version() {
        return this._cliConfig.get('active-version', null);
    }
    set version(value) {
        this._cliConfig.set('active-version', value).save();
        return true;
    }

    /**
     * Version of Ghost-CLI the instance was created/migrated with
     *
     * @property cliVersion
     * @type string
     * @public
     */
    get cliVersion() {
        return this._cliConfig.get('cli-version', null);
    }
    set cliVersion(value) {
        this._cliConfig.set('cli-version', value).save();
        return true;
    }

    /**
     * Previously running version of the instance
     *
     * @property previousVersion
     * @type string
     * @public
     */
    get previousVersion() {
        return this._cliConfig.get('previous-version', null);
    }
    set previousVersion(value) {
        this._cliConfig.set('previous-version', value).save();
        return true;
    }

    /**
     * Returns whether or not the instance has been setup
     *
     * @property isSetup
     * @type boolean
     * @public
     */
    get isSetup() {
        return this.system.hasInstance(this);
    }

    /**
     * Constructs the instance
     *
     * @param {UI} ui UI instance
     * @param {System} system System instance
     * @param {string} dir Absolute path of the instance folder
     */
    constructor(ui, system, dir) {
        this.ui = ui;
        this.system = system;
        this.dir = dir;

        this._cliConfig = new Config(path.join(this.dir, '.ghost-cli'));
    }

    /**
     * If no args specified, returns whether or not the instance is running
     * If arg specified, sets the running environment to the passed environment
     *
     * @param {String} environment Environment to set
     * @return {Promise<Boolean>} true if instance is running, otherwise false
     *
     * @method running
     * @public
     */
    running(environment) {
        if (environment !== undefined) {
            // setter
            this._cliConfig.set('running', environment).save();
            return Promise.resolve(true);
        }

        if (!this._cliConfig.has('running')) {
            const currentEnvironment = this.system.development;

            const envIsRunning = (environment) => {
                if (!Config.exists(path.join(this.dir, `config.${environment}.json`))) {
                    return Promise.resolve(false);
                }

                this.system.setEnvironment(environment === 'development');
                return Promise.resolve(this.process.isRunning(this.dir)).then((running) => {
                    if (running) {
                        this._cliConfig.set('running', environment).save();
                    }

                    return running;
                });
            };

            // Check production environment first
            return envIsRunning('production').then((production) => {
                if (production) {
                    return true;
                }

                // Check development next
                return envIsRunning('development').then((development) => {
                    if (development) {
                        return true;
                    }

                    this.system.setEnvironment(currentEnvironment);
                    return false;
                });
            });
        }

        this.loadRunningEnvironment();

        return Promise.resolve(this.process.isRunning(this.dir)).then((running) => {
            if (!running) {
                this._cliConfig.set('running', null).save();
            }

            return running;
        });
    }

    /**
     * Checks the environment to see if a dev config exists
     * and not a production one. This is useful because the CLI
     * by default runs in production, but if you install a development
     * instance you might be confused by having to add a --development
     * flag each time you run a command. This works around that confusion
     *
     * @method checkEnvironment
     * @public
     */
    checkEnvironment() {
        if (
            this.system.production &&
            Config.exists(path.join(this.dir, 'config.development.json')) &&
            !Config.exists(path.join(this.dir, 'config.production.json'))
        ) {
            this.ui.log('Found a development config but not a production config, running in development mode instead', 'yellow');
            this.system.setEnvironment(true, true);
        }
    }

    /**
     * Sets the environment of the system to the current running
     * environment of the CLI.
     *
     * @param {bool} setNodeEnv If true, sets the NODE_ENV environment variable
     *               to the running environment
     *
     * @method loadRunningEnvironment
     * @public
     */
    loadRunningEnvironment(setNodeEnv) {
        const env = this._cliConfig.get('running');

        if (!env) {
            throw new Error('This instance is not running.');
        }

        this.system.setEnvironment(env === 'development', setNodeEnv);
    }

    /**
     * Gets a summary of this instance, comprised of various values from
     * the cliConfig and the ghost config
     *
     * @return {Promise<Object>}
     * @method summary
     * @public
     */
    summary() {
        return this.running().then((running) => {
            if (!running) {
                return {
                    name: this.name,
                    dir: this.dir.replace(os.homedir(), '~'),
                    version: this.version,
                    running: false
                };
            }

            return {
                name: this.name,
                dir: this.dir.replace(os.homedir(), '~'),
                running: true,
                version: this.version,
                mode: this.system.environment,
                url: this.config.get('url'),
                port: this.config.get('server.port'),
                process: this.process.name
            };
        });
    }
}

module.exports = Instance;
