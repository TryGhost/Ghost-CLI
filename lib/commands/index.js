var map = require('lodash/map'),
    commands;

commands = [
    require('./buster'),
    require('./config'),
    require('./doctor'),
    require('./install'),
    require('./start'),
    require('./stop'),
    require('./update')
];

function loadCommands(program) {
    return map(commands, function (Command) {
        return new Command(program);
    });
}

module.exports = {
    loadCommands: loadCommands
};
