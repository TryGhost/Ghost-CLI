'use strict';
const eol   = require('os').EOL;
const path  = require('path');
const chalk = require('chalk');
const Listr = require('listr');

const setupChecks           = require('./doctor/checks/setup');
const startCommand          = require('./start');
const configCommand         = require('./config');
const dedupeProcessName     = require('../utils/dedupe-process-name');
const checkValidInstall     = require('../utils/check-valid-install');
const resolveProcessManager = require('../utils/resolve-process');

module.exports.execute = function execute(options) {
    checkValidInstall('setup');

    let context = {
        renderer: this.renderer,
        verbose: this.verbose
    };

    if (options.local) {
        options.url = 'http://localhost:2368/';
        options.pname = 'ghost-local';
        options.process = 'local';
        options.db = 'sqlite3';
        options.dbpath = path.join(process.cwd(), 'content/data/ghost-local.db');
        context.start = true;

        // In the case that the user runs `ghost setup --local`, we want to make
        // sure we're set up in development mode
        this.development = true;
        this.environment = 'development';
    }

    return configCommand.execute.call(this, null, null, options).then((config) => {
        context.config = config;

        if (!options.local && options.stack) {
            return new Listr(setupChecks, {concurrent: true, renderer: this.renderer}).run(context)
                .then((context) => {context.continue = true;})
                .catch((error) => {
                    this.ui.log(
                        `System Stack checks failed with message: '${error.message}'.${eol}` +
                        'Some features of Ghost-CLI may not work without additional configuration.',
                        'yellow'
                    );

                    return this.ui.prompt({
                        type: 'confirm',
                        name: 'continue',
                        message: chalk.blue('Continue anyways?'),
                        default: true
                    }).then((answers) => {
                        if (!answers.continue) {
                            return Promise.reject(new Error(
                                `Setup was halted. Ghost is installed but not fully setup.${eol}` +
                                'Fix any errors shown and re-run `ghost setup`, or run `ghost setup --no-stack`.'
                            ));
                        }
                    });
                });
        }
    }).then(() => {
        if (context.start) {
            return;
        }

        return this.ui.prompt({
            type: 'confirm',
            name: 'start',
            message: 'Do you want to start Ghost?',
            default: true
        });
    }).then((answer) => {
        context.start = context.start || answer.start;

        // De-duplicate process name before setting up the process manager
        dedupeProcessName(context.config);

        let processManager = resolveProcessManager(context.config, this.ui);

        return this.ui.run(processManager.setup(this.environment), 'Finishing setup');
    }).then(() => {
        if (!context.start) {return;}

        return startCommand.execute.call(this);
    });
};
