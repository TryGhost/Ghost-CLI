const validator = require('validator');

const {SystemError} = require('../../errors');
const parseExport = require('./parse-export');
const {isSetup, setup, runImport, downloadContentExport, downloadMembersExport} = require('./api');

const authPrompts = [{
    type: 'string',
    name: 'username',
    message: 'Enter your Ghost administrator email address',
    validate: val => validator.isEmail(`${val}`) || 'You must specify a valid email'
}, {
    type: 'password',
    name: 'password',
    message: 'Enter your Ghost administrator password',
    validate: val => validator.isLength(`${val}`, {min: 10}) || 'Password must be at least 10 characters long'
}];

async function importTask(ui, instance, exportFile) {
    const {data} = parseExport(exportFile);
    const url = instance.config.get('url');

    let prompts = authPrompts;

    const blogIsSetup = await isSetup(instance.version, url);
    if (!blogIsSetup) {
        prompts = authPrompts.slice(1);
    }

    const {username, password} = await ui.prompt(prompts);
    const importUsername = username || data.email;

    return ui.listr([{
        title: 'Running blog setup',
        task: () => setup(instance.version, url, {...data, password}),
        enabled: () => !blogIsSetup
    }, {
        title: 'Running blog import',
        task: () => runImport(instance.version, url, {username: importUsername, password}, exportFile)
    }], false);
}

async function exportTask(ui, instance, contentFile, membersFile) {
    const url = instance.config.get('url');

    const blogIsSetup = await isSetup(instance.version, url);
    if (!blogIsSetup) {
        throw new SystemError('Cannot export content from a blog that hasn\'t been set up.');
    }

    const authData = await ui.prompt(authPrompts);

    await downloadContentExport(instance.version, url, authData, contentFile);

    if (membersFile) {
        await downloadMembersExport(instance.version, url, authData, membersFile);
    }
}

module.exports = {
    importTask,
    exportTask
};
