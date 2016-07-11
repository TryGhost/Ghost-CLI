var _           = require('lodash'),
    pkg         = require('../package'),
    program     = require('commander'),
    commands    = require('./commands');

function cli(args) {
    program.version(pkg.version)
        .option('-d, --dir <path>', 'Path to set as the working directory.');

    commands.loadCommands(program);

    program.parse(args);
}

module.exports = cli;
