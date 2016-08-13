var pkg         = require('../package'),
    program     = require('commander'),
    commands    = require('./commands');

function cli(args) {
    program.version(pkg.version);

    commands.loadCommands(program);

    program.parse(args);
}

module.exports = cli;
