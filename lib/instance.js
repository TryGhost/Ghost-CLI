'use strict';
const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const Config = require('./utils/config');
const Promise = require('bluebird');

const i18n = require('./i18n');

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
            this.cliConfig.set('running', environment).save();
            return Promise.resolve(true);
        }

        if (!this.cliConfig.has('running')) {
            const currentEnvironment = this.system.development;

            const envIsRunning = (environment) => {
                if (!Config.exists(path.join(this.dir, `config.${environment}.json`))) {
                    return Promise.resolve(false);
                }

                this.system.setEnvironment(environment === 'development');
                return Promise.resolve(this.process.isRunning(this.dir)).then((running) => {
                    if (running) {
                        this.cliConfig.set('running', environment).save();
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
                this.cliConfig.set('running', null).save();
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
            this.ui.log(i18n.t('instance.switchingToDevelopmentMode'), 'yellow');
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
        const env = this.cliConfig.get('running');

        if (!env) {
            throw new Error(i18n.t('instance.notRunning'));
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
                    version: this.cliConfig.get('active-version'),
                    running: false
                };
            }

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
        });
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
                message: i18n.t('instance.ask.message', {descriptor: descriptor}),
                default: 'n',
                choices: [
                    {key: 'n', name: i18n.t('instance.ask.continue'), value: 'continue'},
                    {key: 'v', name: i18n.t('instance.ask.view'), value: 'view'},
                    {key: 'e', name: i18n.t('instance.ask.edit'), value: 'edit'}
                ]
            }).then((answer) => {
                const choice = answer.choice;

                if (choice === 'continue') {
                    return this._generateTemplate(contents, descriptor, file, dir);
                }

                if (choice === 'view') {
                    this.ui.log(contents);
                    return this.template(contents, descriptor, file, dir);
                }

                /* istanbul ignore else */
                if (choice === 'edit') {
                    return this.ui.prompt({
                        type: 'editor',
                        name: 'contents',
                        message: i18n.t('instance.ask.confirmedEdit'),
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
        const tmplDir = path.join(this.dir, 'system', 'files');
        const tmplFile = path.join(tmplDir, file);

        const promises = [
            () => fs.ensureDir(tmplDir),
            () => fs.writeFile(tmplFile, contents)
        ];

        // Dir is optional, if a file just needs to be created locally
        // so we log here
        this.ui.success(i18n.t('instance.templateGenerated', {descriptor: descriptor, tmplFile: tmplFile}));

        if (dir) {
            const outputLocation = path.join(dir, file);
            promises.push(() => this.ui.sudo(`ln -sf ${tmplFile} ${outputLocation}`));
        }

        return Promise.each(promises, (fn) => fn()).then(() => {
            return Promise.resolve(true);
        });
    }
}

module.exports = Instance;
