var _       = require('lodash'),
    commands;

commands = [
    require('./buster'),
    require('./start')
];

function loadCommands(program) {
    return _.map(commands, function (Command) {
        return new Command(program);
    });
}

module.exports = {
    loadCommands: loadCommands
};
