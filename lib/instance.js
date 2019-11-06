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
     * Node Version used when installing this version
     *
     * @property nodeVersion
     * @type string
     * @public
     */
    get nodeVersion() {
        return this._cliConfig.get('node-version', process.versions.node);
    }
    set nodeVersion(value) {
        this._cliConfig.set('node-version', value).save();
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
     * Sets the currently running mode of the ghost instance
     *
     * @param {String} environment Environment that's currently running
     *
     * @method setRunningMode
     * @public
     */
    setRunningMode(environment) {
        this._cliConfig.set('running', environment).save();
    }

    /**
     * Returns whether or not the instance is currently running.
     *
     * @return {Promise<Boolean>} true if instance is running, otherwise false
     *
     * @method running
     * @public
     */
    async isRunning() {
        if (!this._cliConfig.has('running')) {
            const currentEnvironment = this.system.development;

            const envIsRunning = async (environment) => {
                if (!Config.exists(path.join(this.dir, `config.${environment}.json`))) {
                    return false;
                }

                this.system.setEnvironment(environment === 'development');
                const running = await this.process.isRunning(this.dir);
                if (running) {
                    this._cliConfig.set('running', environment).save();
                }

                return running;
            };

            const production = await envIsRunning('production');
            if (production) {
                return true;
            }

            const development = await envIsRunning('development');
            if (development) {
                return true;
            }

            this.system.setEnvironment(currentEnvironment);
            return false;
        }

        this.loadRunningEnvironment();

        const running = await this.process.isRunning(this.dir);
        if (!running) {
            this._cliConfig.set('running', null).save();
        }

        return running;
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
     * Starts the Ghost instance
     *
     * @return {Promise<void>}
     * @method start
     * @public
     */
    async start(enable = false) {
        await this.process.start(this.dir, this.system.environment);
        this.setRunningMode(this.system.environment);

        if (!enable) {
            return;
        }

        const isEnabled = await this.process.isEnabled();
        if (isEnabled) {
            return;
        }

        await this.process.enable();
    }

    /**
     * Stops the ghost instance
     *
     * @return {Promise<void>}
     * @method stop
     * @public
     */
    async stop(disable = false) {
        await this.process.stop(this.dir);
        this.setRunningMode(null);

        if (!disable) {
            return;
        }

        const isEnabled = await this.process.isEnabled();
        if (!isEnabled) {
            return;
        }

        await this.process.disable();
    }

    /**
     * Restarts the Ghost instance
     *
     * @returns {Promise<void>}
     * @method restart
     * @public
     */
    async restart() {
        await this.process.restart(this.dir, this.system.environment);
    }

    /**
     * Gets a summary of this instance, comprised of various values from
     * the cliConfig and the ghost config
     *
     * @return {Promise<Object>}
     * @method summary
     * @public
     */
    async summary() {
        const running = await this.isRunning();

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
    }
}

module.exports = Instance;
