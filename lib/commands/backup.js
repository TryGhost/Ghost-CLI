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
            task: this.backupContent.bind(this)
        }, {
            title: 'Writing backup file',
            task: this.writeZipFile
        }],{
            system: this.system,
            argv: argv,
            instance: instance
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

        const saveRoot = ctx.saveLocation
        ctx.saveLocation = path.join(saveRoot, `${ctx.instance.name}.backup.${datetime}.zip`);

        let offset = 1;

        while (fs.existsSync(ctx.saveLocation)) {
            ctx.saveLocation = path.join(saveRoot, `${ctx.instance.name}.backup.${datetime}-${offset}.zip`);
            offset += 1;
        }

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

    backupContent(ctx, dontcare, folder) {
        folder = folder || './content';

        // path MUST be relative
        if (folder.indexOf('./') !== 0) {
            folder = './' + folder;
        }

        if (ctx.argv.verbose) {
            ctx.instance.ui.logVerbose(`Backing up ${folder}`,'blue');
        }

        let files;
        try {
            files = walker(folder, {nodir: true});
        } catch (error) {
            debug(`Failed reading ${folder}: ${error}`);
            return Promise.reject(new errors.SystemError({
                context: error,
                message: 'Failed to read content folder'
            }));
        }

        const cwd = process.cwd();

        const promises = files.map((file) => {
            const location = file.path.replace(/\\/g,'/');
            let dir = path.dirname(location);
            dir = path.relative(cwd, dir);
            const name = path.basename(location);
            const subpath = `${dir}/${name}`;

            return fs.readFile(`./${subpath}`).then((fileData) => {
                ctx.zipFile.addFile(subpath, fileData, '', 644);
            }).catch((err) => {
                if (err.code === 'EISDIR')  { // Symlink
                    return this.backupContent(ctx, null, subpath).catch((error) => {
                        debug(error);
                        ctx.instance.ui.log(`Failed to backup ${subpath}`, 'yellow');
                        // Even though this specific file couldn't be backed up, we want to continue
                        return Promise.resolve();
                    });
                } else {
                    debug(err);
                    ctx.instance.ui.log(`Failed to backup ${subpath}`, 'yellow');
                    // Even though this specific file couldn't be backed up, we want to continue
                    return Promise.resolve();
                }
            });
        });

        return Promise.all(promises);
    }

    backupConfig(ctx) {
        debug('Intializing zip file');
        try {
            const configFileName = `config.${ctx.system.environment}.json`;
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

        return ctx.system.hook('backup').then((extensionFiles) => {
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
        // clear up memory
        ctx.zipFile = null;
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
