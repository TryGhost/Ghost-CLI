'use strict';
const isPlainObject = require('lodash/isPlainObject');
const _get          = require('lodash/get');
const _set          = require('lodash/set');
const _has          = require('lodash/has');
const fs            = require('fs-extra');

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
    constructor(filename, exitOnError) {
        if (!filename) {
            throw new Error('Config file not specified.');
        }

        this.file = filename;

        if (Config.exists(this.file)) {
            this.values = Config.load(this.file, exitOnError);
        } else {
            this.values = {};
        }
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
     * Checks the validity of the current config
     *
     * @method validate
     * @public
     */
    isValid() {
        return (typeof this.values === 'object');
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
        return fs.existsSync(filename);
    }

    /**
     * Reads a config file from disk
     * @param {string} filename Filename to check
     *
     * @static
     * @method valid
     * @public
     */
    static load(filename, exitOnError) {
        let file;
        try {
            file = fs.readJsonSync(filename, 'utf8');
            return file;
        } catch (error) { }

        const chalk = require('chalk');
        const parse = require('jsonic');

        try {
            file = parse( fs.readFileSync(filename, 'utf8') );
            console.log(
                chalk.yellow(`The config in "${filename}" was loaded with relaxed parsing`)
            );
            return file;
        } catch (error) {
            if (exitOnError) {
                console.error(
                    chalk.red(`Can't continue with corrupt config file "${filename}"`)
                );

                console.error("Error details:", error);

                process.exit(1);
            }
            return false;
        }
    }
}

module.exports = Config;
