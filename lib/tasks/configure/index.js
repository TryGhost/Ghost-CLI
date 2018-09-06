const getPrompts = require('./get-prompts');
const parseOptions = require('./parse-options');

module.exports = function configure(ui, config, argv, environment, prompt = true) {
    if (!prompt || !argv.prompt) {
        return parseOptions(config, environment, argv);
    }

    const prompts = getPrompts(config, argv, environment);

    if (!prompts.length) {
        return parseOptions(config, environment, argv);
    }

    return ui.prompt(prompts).then((values) => {
        const db = values.dbhost ? {db: 'mysql'} : {};
        const options = Object.assign({}, argv, db, values);

        return parseOptions(config, environment, options);
    });
};
