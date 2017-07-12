'use strict';
const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const Config = require('./utils/config');
const Promise = require('bluebird');

/**
 * Class for managing the various instance-specific
 * concerns
 *
 * @class System
 */
class Instance {
    /**
     * Local instance config (.ghost-cli)
     * Contains some instance-specific variables
     *
     * @property
     * @type Config
     * @public
     */
    get cliConfig() {
        if (!this._cliConfig) {
            this._cliConfig = new Config(path.join(this.dir, '.ghost-cli'));
        }

        return this._cliConfig;
    }

    /**
     * Process name (makes the instance identifiable on the system)
     *
     * @property name
     * @type string
     * @public
     */
    get name() {
        return this.cliConfig.get('name') || this.config.get('pname');
    }
    set name(value) {
        this.cliConfig.set('name', value).save();
        return true;
    }

    /**
     * Environment this instance is currently running in,
     * or null if this instance is not running
     *
     * @property running
     * @type string|null
     * @public
     */
    get running() {
        if (!this.cliConfig.has('running')) {
            return false;
        }

        this.loadRunningEnvironment();

        if (!this.process.isRunning(this.dir)) {
            this.cliConfig.set('running', null).save();
            return false;
        }

        return true;
    }
    set running(environment) {
        this.cliConfig.set('running', environment).save();
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
        let currentEnv = this.system.environment;

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
        let name = this.config.get('process', 'local');

        if (!this._process || name !== this._process.name) {
            let manager = this.system.getProcessManager(name);
            this._process = new manager.Class(this.ui, this.system, this);
            this._process.name = name;
        }

        return this._process;
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
        let prodConfig = Config.exists(path.join(this.dir, 'config.production.json'));
        let devConfig = Config.exists(path.join(this.dir, 'config.development.json'));

        /**
        * CASE: Attempt to start in production mode, but no production config is found.
        * `Config.exists()` returns an `options.message` property with a detailed error message
        * in case an error (e. g. file doesn't exist or has syntaxerrors) occurred.
        * If the `options` property doesn't exist, the config file was found and valid.
        */
        if (this.system.production && prodConfig.options && !devConfig.options) {
            this.ui.log('The production config is either invalid or missing, running in development mode instead', 'yellow');

            if (prodConfig.options.message) {
                this.ui.log('Message: ' + prodConfig.options.message, 'grey');
            }

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
        let env = this.cliConfig.get('running');

        if (!env) {
            throw new Error('This instance is not running.');
        }

        this.system.setEnvironment(env === 'development', setNodeEnv);
    }

    /**
     * Gets a summary of this instance, comprised of various values from
     * the cliConfig and the ghost config
     *
     * @return Object
     * @method summary
     * @public
     */
    summary() {
        if (!this.running) {
            return {
                name: this.name,
                dir: this.dir.replace(os.homedir(), '~'),
                version: this.cliConfig.get('active-version'),
                running: false
            };
        }

        this.loadRunningEnvironment();

        return {
            name: this.name,
            dir: this.dir.replace(os.homedir(), '~'),
            running: true,
            version: this.cliConfig.get('active-version'),
            mode: this.system.environment,
            url: this.config.get('url'),
            port: this.config.get('server.port'),
            process: this.process.name
        };
    }

    /**
     * Creates a system config file (used mainly by extensions to configure external services)
     * Creates a local copy of the config file in <instance-dir>/system/files, then links
     * the file into the directory needed by the service
     *
     * @param {string} contents Contents of the template file to create
     * @param {string} descriptor Description of the template file (used in the prompt)
     * @param {string} file Filename
     * @param {string} dir Directory to link the config file into
     * @return {bool} True if the config file was created successfully, otherwise false
     * @method template
     * @public
     */
    template(contents, descriptor, file, dir) {
        // If `--no-prompt` is passed to the CLI or the `--verbose` flag was not passed, don't show anything
        if (!this.ui.allowPrompt || !this.ui.verbose) {
            return this._generateTemplate(contents, descriptor, file, dir);
        } else {
            return this.ui.prompt({
                type: 'expand',
                name: 'choice',
                message: `Would you like to view or edit the ${descriptor} file?`,
                default: 'n',
                choices: [
                    {key: 'n', name: 'No, continue', value: 'continue'},
                    {key: 'v', name: 'View the file', value: 'view'},
                    {key: 'e', name: 'Edit the file before generation', value: 'edit'}
                ]
            }).then((answer) => {
                let choice = answer.choice;

                if (choice === 'continue') {
                    return this._generateTemplate(contents, descriptor, file, dir);
                }

                if (choice === 'view') {
                    this.ui.log(contents);
                    return this.template(contents, descriptor, file, dir);
                }

                if (choice === 'edit') {
                    return this.ui.prompt({
                        type: 'editor',
                        name: 'contents',
                        message: 'Edit the generated file',
                        default: contents
                    }).then((answer) => {
                        contents = answer.contents;
                        return this._generateTemplate(contents, descriptor, file, dir);
                    });
                }
            });
        }
    }

    /**
     * Actually handles saving the file. Used by the template method
     *
     * @param {string} contents Contents of file
     * @param {string} descriptor description of file
     * @param {string} file Filename
     * @param {string} dir Directory to link
     * @return {bool} True if the file was successfully created & linked
     */
    _generateTemplate(contents, descriptor, file, dir) {
        let tmplDir = path.join(this.dir, 'system', 'files');
        let tmplFile = path.join(tmplDir, file);

        let promises = [
            () => fs.ensureDir(tmplDir),
            () => fs.writeFile(tmplFile, contents)
        ];

        // Dir is optional, if a file just needs to be created locally
        // so we log here
        this.ui.success(`Creating ${descriptor} file at ${tmplFile}`);

        if (dir) {
            let outputLocation = path.join(dir, file);
            promises.push(() => this.ui.sudo(`ln -sf ${tmplFile} ${outputLocation}`));
        }

        return Promise.each(promises, (fn) => fn()).then(() => {
            return Promise.resolve(true);
        });
    }
}

module.exports = Instance;
