const validator = require('validator');

const parseExport = require('./parse-export');
const {isSetup, setup, runImport} = require('./api');

async function importTask(ui, instance, exportFile) {
    const {data} = parseExport(exportFile);
    const url = instance.config.get('url');

    const prompts = [{
        type: 'password',
        name: 'password',
        message: 'Enter your Ghost administrator password',
        validate: val => validator.isLength(`${val}`, {min: 10}) || 'Password must be at least 10 characters long'
    }];

    const blogIsSetup = await isSetup(instance.version, url);
    if (blogIsSetup) {
        prompts.unshift({
            type: 'string',
            name: 'username',
            message: 'Enter your Ghost administrator email address',
            validate: val => validator.isEmail(`${val}`) || 'You must specify a valid email'
        });
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

module.exports = {
    importTask
};
