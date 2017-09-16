'use strict';
const Command = require('../command');
const Promise = require('bluebird');
const createDebug = require('debug');
const Zip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const cli = require('../');

const debug = createDebug('ghost-cli:backup');

function absolutePath(inputPath) {
    return path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
}

class BackupCommand extends Command {
    run(argv) {
        const instance = this.system.getInstance();
        const datetime = (new Date()).toJSON().substring(0, 10);

        this.database = {};
        this.saveLocation = process.cwd();

        if (argv.output) {
            this.saveLocation = absolutePath(this.saveLocation);
            fs.ensureDirSync(this.backupData.saveLocation);
        }

        this.saveLocation = path.join(this.saveLocation, `ghost.backup.${datetime}.zip`)

        // The zip library used (adm-zip) has a known issue where the zip is structurally sound,
        // but Windows has issues reading / unzipping it. To counteract this, all files are read
        // and added via the `addFile` method, where the file permissions can be set, seemingly
        // resolving the issue. See https://github.com/cthackers/adm-zip/issues/171
        this.zipFile = new Zip();

        if (instance.running()) {
            this.ui.log('Ghost is currently running. Backing up might take longer and slow down your site', 'yellow');
            instance.loadRunningEnvironment();
        } else {
            instance.checkEnvironment();
        }

        return this.ui.listr([{
            title: 'Backing up plugins',
            task: this.backupPlugins.bind(this)
        }, {
            title: 'Backing up database',
            task: this.backupDatabase.bind(this)
        }, {
            title: 'Backing up config files',
            task: this.backupConfig.bind(this)
        }, {
            title: 'Backing up content folder',
            task: this.backupContent.bind(this)
        }, {
            title: `Writing backup file to ${this.saveLocation}`,
            task: this.writeZipFile.bind(this)
        }]);
    }

    backupContent() {
        // Add content folder // @todo: Do we need to check if the content folder exists?
        // @todo: Figure out how to deal with Windows bug
        this.zipFile.addLocalFolder(path.join(process.cwd(), 'content/'), 'content/');
    }

    backupConfig() {
        debug('Intializing zip file');
        try {
            const configFileName = `config.${this.system.environment}.json`;
            const readFile = fs.readFileSync;

            // Add environment-specific config file
            this.zipFile.addFile(configFileName, readFile(configFileName), '', 644);
            // Add CLI config file
            this.zipFile.addFile('.ghost-cli', readFile('.ghost-cli'), '', 644);

            return Promise.resolve();
        } catch (error) {
            debug(`Failed creating zip: ${error}`);
            return Promise.reject(new cli.errors.SystemError({
                context: error,
                message: 'Failed to create zip file'
            }));
        }
    }

    backupPlugins() {
        // @todo: remove this when the hooks bug is fixed
        return Promise.resolve();
        // const each = require('lodash/each');

        // return this.system.hook('backup', this).then((filesToAdd) => {
        //     each(filesToAdd, (contents, filename) => {
        //         this.zipFile.addFile(`extension/${fileName}`, contents, '', 644);
        //     });
        // });
    }

    writeZipFile() {
        // Write zip file to specified folder
        debug(`Writing zipFile to ${this.saveLocation}`);
        this.zipFile.writeZip(this.saveLocation);
        debug('Done writing zip');
    }

    backupDatabase() {
        debug('Creating database backup');
        debug(this.system.environment);
        let exporter;
        try {
            // This is based on cwd, not cli-install location
            exporter = require(absolutePath('current/core/server/data/export/'));
        } catch (e) {
            debug(`Failed to load exporter: ${e}`)
            return Promise.reject(new Error('Unable to initialize database exporter'));
        }
        return exporter.doExport().then((database) => {
            database = JSON.stringify(database);
            this.zipFile.addFile('database.json', Buffer.from(database), '', 644);
        }).catch((error) => {
            if (error.code === 'ECONNREFUSED') {
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
