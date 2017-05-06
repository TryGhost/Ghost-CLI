'use strict';
const advancedOptions = require('./commands/config/advanced');

module.exports = {
    config: {
        description: 'Configure a Ghost instance',

        arguments: [{
            name: 'key',
            optional: true
        }, {
            name: 'value',
            optional: true
        }],

        options: advancedOptions
    },

    doctor: {
        description: 'Check the system for any potential hiccups when installing/updating Ghost',

        arguments: [
            {name: 'category', optional: true}
        ]
    },

    buster: {
        description: 'Who ya gonna call?'
    },

    install: {
        alias: 'i',
        description: 'Install a brand new instance of Ghost',

        arguments: [
            {name: 'version', optional: true}
        ],
        options: [{
            name: 'dir',
            alias: 'd',
            description: 'Folder to install Ghost in'
        }, {
            name: 'no-setup',
            alias: 'N',
            description: 'Don\'t automatically run the setup command',
            flag: true
        }, {
            name: 'no-stack',
            description: 'Don\'t check the system stack on setup',
            flag: true
        }].concat(advancedOptions)
    },

    log: {
        description: 'View logs of a running ghost process',

        arguments: ['name'],
        options: [{
            name: 'number',
            alias: 'n',
            description: 'Number of lines to view',
            defaultValue: 20
        }, {
            name: 'follow',
            alias: 'f',
            description: 'Follow the log file (similar to `tail -f`)',
            flag: true
        }]
    },

    ls: {
        description: 'View running ghost processes'
    },

    restart: {
        description: 'Restart the Ghost instance'
    },

    run: {
        description: 'Run a ghost instance directly (used by process managers and for debugging)'
    },

    service: {
        description: 'Run a service-defined command',

        arguments: [
            'command',
            {name: 'args', optional: true, variadic: true}
        ]
    },

    setup: {
        description: 'Setup an installation of Ghost (after it is installed)',

        options: [{
            name: 'no-stack',
            description: 'Don\'t check the system stack on setup',
            flag: true
        }, {
            name: 'local',
            alias: 'l',
            description: 'Quick setup for a local installation of Ghost',
            flag: true
        }].concat(advancedOptions)
    },

    start: {
        description: 'Start an instance of Ghost'
    },

    stop: {
        description: 'Stops a named instance of Ghost',

        options: [{
            name: 'all',
            alias: 'a',
            description: 'option to stop all running Ghost blogs',
            flag: true
        }]
    },

    update: {
        description: 'Update a Ghost instance',

        arguments: [
            {name: 'version', optional: true}
        ],
        options: [{
            name: 'rollback',
            alias: 'R',
            description: 'Rollback to the previously installed Ghost version',
            flag: true
        }, {
            name: 'force',
            alias: 'f',
            description: 'Force Ghost to update',
            flag: true
        }]
    },

    uninstall: {
        description: 'Remove a Ghost instance & any related configuration files'
    }
}
