'use strict';
const {get: _get, set: _set, has: _has} = require('./object-path');
const {readJSONSync, writeJSONSync} = require('./json');

const isPlainObject = value => Boolean(value) && Object.getPrototypeOf(value) === Object.prototype;

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
     * Gets a value from the config file. Supports dot-notation keys
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
        writeJSONSync(this.file, this.values);
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
            const result = readJSONSync(filename);
            return result;
        } catch {
            return false;
        }
    }
}

module.exports = Config;
