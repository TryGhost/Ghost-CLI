'use strict';
const Listr     = require('listr');
const eol       = require('os').EOL;

module.exports.execute = function execute(category) {
    category = category || 'install';

    let checks;

    try {
        checks = require('./checks/' + category);
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            this.ui.fail('Invalid category of checks');
            return Promise.reject();
        }

        return Promise.reject(e);
    }

    let tasks = new Listr(checks, {concurrent: true, renderer: this.renderer});

    return tasks.run(this).then(() => {
        this.ui.success(`All ${category} checks passed`);
    }).catch((error) => {
        this.ui.log(`${eol}Checks failed:`, 'red');
        this.ui.log(`${eol}    ${error.message}${eol}`);
    });
};
