'use strict';
const isPlainObject = require('lodash/isPlainObject');
const _get = require('lodash/get');
const _set = require('lodash/set');
const _has = require('lodash/has');
const fs = require('fs-extra');

/**
 * Config class. Basic wrapper around a json file, but handles
 * nested properties editing, default values, and saving
 *
 * @class Config
 */
class Config {
    /**
     * Constructs the config instance
     *
     * @param {string} filename Filename to load
     */
    constructor(filename) {
        if (!filename) {
            throw new Error('Config file not specified.');
        }

        this.file = filename;
        this.values = Config.exists(this.file) || {};
    }

    /**
     * Gets a value from the config file. Uses the lodash `get` method
     *
     * @param {string} key Key to get
     * @param {any} defaultValue Value to return if config value doesn't exist
     * @return {any} Value in the config file if it exists, otherwise null
     *
     * @method get
     * @public
     */
    get(key, defaultValue) {
        return _get(this.values, key, defaultValue);
    }

    /**
     * Sets a value in the config.
     * If 'value' is null, removes the key from the config
     *
     * @param {string} key Key to set
     * @param {any} value Value to set at `key`
     * @return Config This config instance
     *
     * @method get
     * @public
     */
    set(key, value) {
        if (isPlainObject(key)) {
            Object.assign(this.values, key);
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

    /**
     * Checks if a value exists for 'key' in the config
     *
     * @param {string} key Key to check
     * @return bool Whether or not the config value exists
     *
     * @method has
     * @public
     */
    has(key) {
        return _has(this.values, key);
    }

    /**
     * Saves the config file to disk
     *
     * @method save
     * @public
     */
    save() {
        // Write with spaces to make the files easier to edit manually
        fs.writeJsonSync(this.file, this.values, {spaces: 2});
        return this;
    }

    /**
     * Checks whether or not a config file exists
     * @param {string} filename Filename to check
     *
     * @static
     * @method exists
     * @public
     */
    static exists(filename) {
        try {
            const result = fs.readJsonSync(filename);
            return result;
        } catch (e) {
            return false;
        }
    }
}

module.exports = Config;
