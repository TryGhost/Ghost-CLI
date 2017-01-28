'use strict';
const isPlainObject = require('lodash/isPlainObject');
const assign        = require('lodash/assign');
const path          = require('path');
const _get          = require('lodash/get');
const _set          = require('lodash/set');
const _has          = require('lodash/has');
const fs            = require('fs-extra');

let singletonCache = {};

class Config {
    constructor(filename) {
        if (!filename) {
            throw new Error('Config file not specified.');
        }

        this.file = path.join(process.cwd(), filename);
        this.values = Config.exists(this.file) || {};
    }

    get(key, defaultValue) {
        return _get(this.values, key, defaultValue);
    }

    set(key, value) {
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
    }

    has(key) {
        return _has(this.values, key);
    }

    save() {
        fs.writeJsonSync(this.file, this.values);
        return this;
    }

    static exists(filename) {
        try {
            var result = fs.readJsonSync(filename);
            return result;
        } catch (e) {
            return false;
        }
    }

    static load(filename) {
        if (singletonCache[filename] && singletonCache[filename] instanceof Config) {
            return singletonCache[filename];
        }

        let configInstance = new Config(filename);
        singletonCache[filename] = configInstance;

        return configInstance;
    }
};

module.exports = Config;
