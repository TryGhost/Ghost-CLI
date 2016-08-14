var reduce = require('lodash/reduce'),
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
    return reduce(commands, function (namedCommands, Command) {
        var cmdInstance = new Command(program);
        namedCommands[cmdInstance.name] = cmdInstance;

        return namedCommands;
    }, {});
}

module.exports = {
    loadCommands: loadCommands
};
