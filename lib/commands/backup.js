'use strict';
const Command = require('../command');
const Promise = require('bluebird');
const createDebug = require('debug');
const Zip = require('adm-zip');
const walker = require('klaw-sync');
const fs = require('fs-extra');
const path = require('path');
const errors = require('../').errors;

const debug = createDebug('ghost-cli:backup');

function absolutePath(inputPath) {
    return path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
}

class BackupCommand extends Command {
    run(argv) {
        const instance = this.system.getInstance();

        return this.ui.listr([{
            task: this.initialize,
            title: 'Checking configuration'
        }, {
            title: 'Backing up extensions',
            task: this.backupExtensions
        }, {
            title: 'Backing up database',
            task: this.backupDatabase
        }, {
            title: 'Backing up config files',
            task: this.backupConfig
        }, {
            title: 'Backing up content folder',
            task: this.backupContent
        }, {
            title: 'Writing backup file',
            task: this.writeZipFile
        }],{
            env: this.system.environment,
            argv: argv,
            instance: instance,
            hook: this.system.hook
        });
    }

    initialize(ctx) {
        const datetime = (new Date()).toJSON().substring(0, 10);

        ctx.database = {};
        ctx.saveLocation = process.cwd();

        if (ctx.argv.output) {
            ctx.saveLocation = absolutePath(ctx.argv.output);
        }

        try {
            fs.ensureDirSync(ctx.saveLocation);
            // After we're sure the directory exists, check to make sure we can write to it
            fs.accessSync(ctx.saveLocation, fs.W_OK);
        } catch (error) {
            ctx.instance.ui.log('Ghost doesn\'t have permission to write to the output folder', 'red');
            return Promise.reject(new errors.SystemError(error));
        }

        ctx.saveLocation = path.join(ctx.saveLocation, `${ctx.instance.name}.backup.${datetime}.zip`);

        // The zip library used (adm-zip) has a known issue where the zip is structurally sound,
        // but Windows has issues reading / unzipping it. To counteract this, all files are read
        // and added via the `addFile` method, where the file permissions can be set, seemingly
        // resolving the issue. See https://github.com/cthackers/adm-zip/issues/171
        ctx.zipFile = new Zip();

        if (ctx.instance.running()) {
            ctx.instance.ui.log('Ghost is currently running. Backing up might take longer and slow down your site', 'yellow');
            ctx.instance.loadRunningEnvironment();
        } else {
            ctx.instance.checkEnvironment();
        }

        return Promise.resolve();
    }

    backupContent(ctx) {
        let files;
        try {
            files = walker('./content', {nodir: true});
        } catch (error) {
            debug(`Failed reading content folder: ${error}`);
            return Promise.reject(new errors.SystemError({
                context: error,
                message: 'Failed to read content folder'
            }));
        }

        const cwd = process.cwd();
        const readFile = fs.readFileSync;

        files.forEach((file) => {
            const location = file.path.replace(/\\/g,'/');
            let dir = path.dirname(location);
            const name = path.basename(location);
            dir = path.relative(cwd, dir);

            try {
                ctx.zipFile.addFile(`${dir}/${name}`, readFile(`./${dir}/${name}`), '', 644);
            } catch (err) {
                ctx.instance.ui.log(`Failed to backup ${dir}/${name}`, 'yellow');
            }
        });

        return Promise.resolve();
    }

    backupConfig(ctx) {
        debug('Intializing zip file');
        try {
            const configFileName = `config.${ctx.env}.json`;
            const readFile = fs.readFileSync;

            // Add environment-specific config file
            ctx.zipFile.addFile(configFileName, readFile(configFileName), '', 644);
            // Add CLI config file
            ctx.zipFile.addFile('.ghost-cli', readFile('.ghost-cli'), '', 644);

            return Promise.resolve();
        } catch (error) {
            debug(`Failed creating zip: ${error}`);
            return Promise.reject(new errors.SystemError({
                context: error,
                message: 'Failed backing up configuration files'
            }));
        }
    }

    backupExtensions(ctx) {
        const each = require('lodash/each');
        const isArray = require('lodash/isArray');
        const read = fs.readFileSync;

        return ctx.hook('backup').then((extensionFiles) => {
            each(extensionFiles, (filesToAdd) => {
                if (isArray(filesToAdd)) {
                    each(filesToAdd, (metadata) => {
                        try {
                            ctx.zipFile.addFile(`extension/${metadata.fileName}`, read(metadata.location), '', 644);
                        } catch (error) {
                            ctx.ui.log(`Not backing up "${metadata.description || metadata.location}" - ${error.message}`);
                        }
                    });
                } /* else if(filesToAdd !== undefined) {
                    // @todo: do we need to do anything here?
                    debug('Bad data passed');
                }*/
            });
        }).catch(Promise.reject);
    }

    writeZipFile(ctx) {
        // Write zip file to specified folder
        debug(`Writing zipFile to ${ctx.saveLocation}`);
        ctx.zipFile.writeZip(ctx.saveLocation);
        ctx.instance.ui.log(`Wrote backup to ${ctx.saveLocation}`);
        return Promise.resolve();
    }

    backupDatabase(ctx) {
        debug('Creating database backup');
        let exporter;
        try {
            // This is based on cwd, not cli-install location
            exporter = require(absolutePath('current/core/server/data/export/'));
        } catch (error) {
            debug(`Failed to load exporter: ${error}`);
            // @todo: specific error type?
            return Promise.reject(new Error('Unable to initialize database exporter'));
        }
        return exporter.doExport().then((database) => {
            database = JSON.stringify(database);
            ctx.zipFile.addFile('database.json', Buffer.from(database), '', 644);
            return Promise.resolve();
        }).catch((error) => {
            if (error.code === 'ECONNREFUSED') {
                // @todo: should this be a system error?
                return Promise.reject(new Error('Unable to connect to MySQL'));
            } else {
                return Promise.reject(error);
            }
        });
    }
}
BackupCommand.description = 'Create a backup of your installation';
BackupCommand.options = {
    output: {
        alias: 'o',
        description: 'Folder to save backup in',
        type: 'string'
    }
};
module.exports = BackupCommand;
