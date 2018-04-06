'use strict';
/* global Intl */

const supportedLocales = ['en'];
const chalk = require('chalk');
const fs = require('fs-extra');
const MessageFormat = require('intl-messageformat');
const jp = require('jsonpath');
const _ = require('lodash');
const path = require('path');

let currentLocale;
let translations;

/**
 * Setup i18n support:
 *  - Polyfill node.js if it does not have Intl support or support for a particular locale
 */
function initializeGlobalIntl() {
    let hasBuiltInLocaleData, IntlPolyfill;

    if (global.Intl) {
        // Determine if the built-in `Intl` has the locale data we need.
        hasBuiltInLocaleData = supportedLocales.every((locale) => {
            return Intl.NumberFormat.supportedLocalesOf(locale)[0] === locale &&
                Intl.DateTimeFormat.supportedLocalesOf(locale)[0] === locale;
        });
        if (!hasBuiltInLocaleData) {
            // `Intl` exists, but it doesn't have the data we need, so load the
            // polyfill and replace the constructors with need with the polyfill's.
            IntlPolyfill = require('intl');
            Intl.NumberFormat = IntlPolyfill.NumberFormat;
            Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;
        }
    } else {
        // No `Intl`, so use and load the polyfill.
        global.Intl = require('intl');
    }
}

const I18n = {
    /**
     * Helper method to find and compile the given data context with a proper string resource.
     *
     * @param {string} path Path with in the JSON language file to desired string (ie: "errors.init.jsNotBuilt")
     * @param {object} [bindings]
     * @returns {string}
     */
    t: function t(path, bindings) {
        // TODO: Dynamically generate this
        currentLocale = 'en';

        const string = I18n.findString(path);
        let msg = new MessageFormat(string, currentLocale);

        try {
            msg = msg.format(bindings);
        } catch (err) {
            // TODO: implement
            // logging.error(err.message);

            // fallback
            console.log(translations.errors);
            msg = new MessageFormat(translations.errors.anErrorOccurred, currentLocale);
            msg = msg.format();
        }

        return msg;
    },

    /**
     * Parse JSON file for matching locale, returns string giving path.
     *
     * @param {string} msgPath Path with in the JSON language file to desired string (ie: "errors.init.jsNotBuilt")
     * @returns {string}
     */
    findString: function findString(msgPath, opts) {
        const options = _.merge({log: true}, opts || {});
        let matchingString;
        const path = `$.${msgPath}`;

        // no path? no string
        if (_.isEmpty(msgPath) || !_.isString(msgPath)) {
            chalk.yellow('i18n.t() - received an empty path.');
            return '';
        }

        // If not in memory, load translations for core
        if (translations === undefined) {
            I18n.init();
        }

        matchingString = jp.value(translations, path) || {};

        if (_.isObject(matchingString) || _.isEqual(matchingString, {})) {
            if (options.log || 1    ) {
                // TODO
                console.error(new Error(`i18n error: path "${msgPath}" was not found`));
            }

            matchingString = translations.errors.anErrorOccurred;
        }

        return matchingString;
    },

    doesTranslationKeyExist: function doesTranslationKeyExist(msgPath) {
        const translation = I18n.findString(msgPath, {log: false});
        return translation !== translations.errors.anErrorOccurred;
    },

    /**
     * Setup i18n support:
     *  - Load proper language file into memory
     */
    init: function init() {
        // if translation file is not valid, you will see an error
        try {
            translations = fs.readJsonSync(path.join(__dirname, 'translations', 'en.json'));
        } catch (err) {
            translations = undefined;
            throw err;
        }

        initializeGlobalIntl();
    }
};

module.exports = I18n;
