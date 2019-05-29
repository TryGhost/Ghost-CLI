'use strict';
const fs = require('fs-extra');
const path = require('path');
const mapValues = require('lodash/mapValues');
const Promise = require('bluebird');

/**
 * Handles various extension-related behavior
 *
 * @class Extension
 */
class Extension {
    /**
     * Gets the available process managers (if any) from this extension
     * By default it checks the package.json for any listed ones, but subclasses
     * can override this method to do it a different way.
     *
     * @property processManagers
     * @type Object
     * @public
     */
    get processManagers() {
        if (!this.pkg || !this.pkg['ghost-cli'] || !this.pkg['ghost-cli']['process-managers']) {
            return {};
        }

        return mapValues(this.pkg['ghost-cli']['process-managers'], relPath => path.join(this.dir, relPath));
    }

    /**
     * Creates the extension instance
     *
     * @param {UI} ui UI instance
     * @param {System} system System instance
     * @param {Object} pkg Package.json contents
     * @param {string} dir Extension directory
     */
    constructor(ui, system, pkg, dir) {
        this.ui = ui;
        this.system = system;
        this.pkg = pkg;
        this.dir = dir;
    }

    /**
     * Creates a system config file (used mainly by extensions to configure external services)
     * Creates a local copy of the config file in <instance-dir>/system/files, then links
     * the file into the directory needed by the service
     *
     * @param {Instance} instance Ghost instance reference
     * @param {string} contents Contents of the template file to create
     * @param {string} descriptor Description of the template file (used in the prompt)
     * @param {string} file Filename
     * @param {string} dir Directory to link the config file into
     * @return {bool} True if the config file was created successfully, otherwise false
     * @method template
     * @public
     */
    template(instance, contents, descriptor, file, dir) {
        // If `--no-prompt` is passed to the CLI or the `--verbose` flag was not passed, don't show anything
        if (!this.ui.allowPrompt || !this.ui.verbose) {
            return this._generateTemplate(instance, contents, descriptor, file, dir);
        } else {
            return this.ui.prompt({
                type: 'expand',
                name: 'choice',
                message: `Would you like to view or edit the ${descriptor} file?`,
                default: 0,
                choices: [
                    {key: 'n', name: 'No, continue', value: 'continue'},
                    {key: 'v', name: 'View the file', value: 'view'},
                    {key: 'e', name: 'Edit the file before generation', value: 'edit'}
                ]
            }).then((answer) => {
                const choice = answer.choice;

                if (choice === 'continue') {
                    return this._generateTemplate(instance, contents, descriptor, file, dir);
                }

                if (choice === 'view') {
                    this.ui.log(contents);
                    return this.template(instance, contents, descriptor, file, dir);
                }

                /* istanbul ignore else */
                if (choice === 'edit') {
                    return this.ui.prompt({
                        type: 'editor',
                        name: 'contents',
                        message: 'Edit the generated file',
                        default: contents
                    }).then((answer) => {
                        contents = answer.contents;
                        return this._generateTemplate(instance, contents, descriptor, file, dir);
                    });
                }
            });
        }
    }

    /**
     * Actually handles saving the file. Used by the template method
     *
     * @param {Instance} instance Ghost instance
     * @param {string} contents Contents of file
     * @param {string} descriptor description of file
     * @param {string} file Filename
     * @param {string} dir Directory to link
     * @return {bool} True if the file was successfully created & linked
     */
    _generateTemplate(instance, contents, descriptor, file, dir) {
        const tmplDir = path.join(instance.dir, 'system', 'files');
        const tmplFile = path.join(tmplDir, file);

        const promises = [
            () => fs.ensureDir(tmplDir),
            () => fs.writeFile(tmplFile, contents)
        ];

        // Dir is optional, if a file just needs to be created locally
        // so we log here
        this.ui.success(`Creating ${descriptor} file at ${tmplFile}`);

        if (dir) {
            const outputLocation = path.join(dir, file);
            promises.push(() => this.ui.sudo(`ln -sf ${tmplFile} ${outputLocation}`));
        }

        return Promise.each(promises, fn => fn()).then(() => Promise.resolve(true));
    }

    /**
     * Gets the Extension instance for a given extension. An extension can
     * extend this class and override some of it's features. If no such subclass exists
     * an instance of the base class (this one) will be returned
     *
     * @param {UI} ui UI instance
     * @param {System} system System instance
     * @param {Object} extension Object (returned from find-plugins) containing the
     *                 package.json contents and the dir of the extension
     * @return Extension
     * @static
     * @method getInstance
     * @private
     */
    static getInstance(ui, system, extension) {
        const pkg = extension.pkg;
        const dir = extension.dir;

        // TODO: currently this returns an instance of the base class only if
        // the pkg.main doesn't exist. If any errors are generated by these checks here,
        // nothing is returned. We should probably either throw an error here or return
        // an instance of the base class
        if (pkg.main) {
            if (!fs.existsSync(path.join(dir, pkg.main))) {
                ui.log(`Extension '${pkg.name}' has a main entry, but no such file exists`, 'yellow');
                return;
            }

            const ExtensionSubclass = require(path.join(dir, path.basename(pkg.main, '.js')));

            if (!ExtensionSubclass || !(ExtensionSubclass.prototype instanceof Extension)) {
                ui.log(`Extension '${pkg.name}' supplied a main file, but it is not a valid Extension subclass`, 'yellow');
                return;
            }

            return new ExtensionSubclass(ui, system, pkg, dir);
        }

        return new this(ui, system, pkg, dir);
    }
}

module.exports = Extension;
