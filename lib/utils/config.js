var path = require('path'),
    _get = require('lodash/get'),
    _set = require('lodash/set'),
    fs = require('fs-extra'),

    Config, CONFIG_FILENAME;

CONFIG_FILENAME = '.ghost-cli';

Config = function Config() {
    if (Config.cliConfigExists()) {
        this.load();
    } else {
        this.values = {};
    }
};

Config.prototype.get = function get(key) {
    return _get(this.values, key);
};

Config.prototype.set = function set(key, value) {
    _set(this.values, key, value);
    return this;
};

Config.prototype.load = function load() {
    this.values = fs.readJsonSync(
        path.join(process.cwd(), CONFIG_FILENAME),
        {throws: false}
    ) || {};

    return this;
};

Config.prototype.save = function save() {
    fs.writeJsonSync(path.join(process.cwd(), CONFIG_FILENAME), this.values);
    return this;
};

Config.cliConfigExists = function cliConfigExists(dir) {
    dir = dir ? path.resolve(dir) : process.cwd();

    return fs.existsSync(path.join(dir, CONFIG_FILENAME));
};

module.exports = Config;
