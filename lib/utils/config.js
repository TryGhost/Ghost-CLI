var isPlainObject = require('lodash/isPlainObject'),
    assign = require('lodash/assign'),
    path = require('path'),
    _get = require('lodash/get'),
    _set = require('lodash/set'),
    _has = require('lodash/has'),
    fs = require('fs-extra'),

    Config;

Config = function Config(filename) {
    if (!filename) {
        throw new Error('Config file not specified.');
    }

    this.file = path.join(process.cwd(), filename);
    this.values = Config.exists(this.file) || {};
};

Config.prototype.get = function get(key, defaultValue) {
    return _get(this.values, key, defaultValue);
};

Config.prototype.set = function set(key, value) {
    if (isPlainObject(key)) {
        assign(this.values, key);
        return this;
    }

    // Setting a value to null removes it from the config
    if (value === null) {
        delete this.values[key];
        return this;
    }

    _set(this.values, key, value);
    return this;
};

Config.prototype.has = function has(key) {
    return _has(this.values, key);
};

Config.prototype.save = function save() {
    fs.writeJsonSync(this.file, this.values);
    return this;
};

Config.exists = function exists(filename) {
    try {
        var result = fs.readJsonSync(filename);
        return result;
    } catch (e) {
        return false;
    }
};

module.exports = Config;
