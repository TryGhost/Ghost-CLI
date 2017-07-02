'use strict';
const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const Config = require('./utils/config');
const Promise = require('bluebird');

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

    get config() {
        let currentEnv = this.system.environment;

        if (!this._config || this._config.environment !== currentEnv) {
            this._config = new Config(path.join(this.dir, `config.${this.system.environment}.json`));
            this._config.environment = this.system.environment;
        }

        return this._config;
    }

    get process() {
        let name = this.config.get('process', 'local');

        if (!this._process || name !== this._process.name) {
            let manager = this.system.getProcessManager(name);
            this._process = new manager.Class(this.ui, this.system, this);
            this._process.name = name;
        }

        return this._process;
    }

    constructor(ui, system, dir) {
        this.ui = ui;
        this.system = system;
        this.dir = dir;
    }

    checkEnvironment() {
        if (
            this.system.production &&
            Config.exists(path.join(this.dir, 'config.development.json')) &&
            !Config.exists(path.join('config.production.json'))
        ) {
            this.ui.log('Found a development config but not a production config, running in development mode instead', 'yellow');
            this.system.setEnvironment(true, true);
        }
    }

    loadRunningEnvironment(setEnv, setNodeEnv) {
        let env = this.cliConfig.get('running');

        if (!env) {
            throw new Error('This instance is not running.');
        }

        if (setEnv) {
            this.system.setEnvironment(env === 'development', setNodeEnv);
        }
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

        this.loadRunningEnvironment(true);

        return {
            name: this.name,
            dir: this.dir.replace(os.homedir(), '~'),
            running: true,
            version: this.cliConfig.get('active-version'),
            mode: this.system.environment,
            url: this.config.get('url'),
            port: this.config.get('server.port'),
            process: this._process.name
        };
    }

    template(contents, descriptor, file, dir) {
        return this.ui.prompt({
            type: 'expand',
            name: 'choice',
            message: `Ghost-CLI would like to generate a ${descriptor} file.`,
            default: 'y',
            choices: [
                { key: 'y', name: 'Yes, write config file', value: 'write' },
                { key: 'n', name: 'No, don\'t create the file', value: 'skip' },
                { key: 'v', name: 'View the file', value: 'view' },
                { key: 'e', name: 'Edit the file before generation', value: 'edit' }
            ]
        }).then((answer) => {
            let choice = answer.choice;

            if (choice === 'skip') {
                return Promise.resolve(false);
            }

            if (choice === 'write') {
                return this._generateTemplate(contents, file, dir);
            }

            if (choice === 'view') {
                this.ui.log(contents);
                return this.template(contents, descriptor, file, dir);
            }

            if (choice === 'edit') {
                return this.ui.prompt({
                    type: 'editor',
                    name: 'contents',
                    message: 'Edit the generated file'
                }).then((answer) => {
                    contents = answer.contents;
                    return this._generateTemplate(contents, file, dir);
                });
            }
        });
    }

    _generateTemplate(contents, file, dir) {
        let tmplDir = path.join(this.dir, 'system', 'files');
        let tmplFile = path.join(tmplDir, file);

        let promises = [
            () => fs.ensureDir(tmplDir),
            () => fs.writeFile(tmplFile, contents)
        ];

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
