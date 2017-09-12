'use strict';
const Command = require('../command');
const Promise = require('bluebird');
const createDebug = require('debug');
const Zip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const cli = require('../');

const debug = createDebug('ghost-cli:backup');

class BackupCommand extends Command {
    run(argv) {
        const instance = this.system.getInstance();
        const config = instance.config.values;
        const datetime = (new Date()).toJSON().substring(0, 10);

        let exporter;
        let saveLocation = process.cwd();

        // @todo check if we need to ensure we're in a ghost directory

        if (argv.output) { // @todo add o as an alias
            saveLocation = path.isAbsolute(argv.output) ? argv.output : path.join(process.cwd(), argv.output);
            fs.ensureDirSync(saveLocation);
        }

        saveLocation = path.join(saveLocation, `ghost.backup.${datetime}.zip`)

        instance.checkEnvironment();

        if (instance.running()) {
            this.ui.log('Ghost is currently running. Backing up might take longer and slow down your site','yellow');
        }

        const backupData = {
            versions: {
                cli: this.system.cliVersion,
                ghost: instance.cliConfig.get('active-version')
            },
            database: config.database.client,
            contentPath: config.paths.contentPath,
            // @todo: check if this is necessary
            environment: instance.config.environment
        }

        try {
            // @todo: check if we need to `path.join`
            exporter = require(path.join(process.cwd(),'/current/core/server/data/export'));
        } catch (e) {
            console.log(e);
            return Promise.reject(new Error('Unable to initialize database exporter'));
        }

        // @todo: Log this?
        debug('Creating database backup');

        let props = {
            database : exporter.doExport({}),
            environment: this.system.environment
        };

        return Promise.props(props).then(function(data)
        {
            try {
                /*
                * Create the zip file
                * The zip file contains 5 important pieces
                *   - The content directory (images, adapters, etc.)
                *   - The config file (Environment specific)
                *   - The CLI Config file
                *   - The database (exported via the exporter - posts, settings, etc.)
                *   - The .ghost-backup (key settings)
                */

                const configFileName = `config.${data.environment}.json`;
                let zipFile = new Zip();

                // Add content folder //@todo: Do we need to check if the content folder exists?
                zipFile.addLocalFolder(path.join(process.cwd(), 'content/'), 'content/');
                // Add environment-specific config file
                zipFile.addLocalFile(path.join(process.cwd(), configFileName));
                // Add CLI config file
                zipFile.addLocalFile(path.join(process.cwd(), '.ghost-cli'));
                // Add database
                zipFile.addFile('database.json', Buffer.from(JSON.stringify(data.database)));
                // Add .ghost-backup
                zipFile.addFile('.ghost-backup', Buffer.from(JSON.stringify(backupData)));

                // Write zip file to cwd
                zipFile.writeZip(saveLocation);
                debug(`Wrote zipFile`)

                return Promise.resolve(saveLocation);
            } catch (error) {
                debug(`Failed creating zip: ${error}`);
                return Promise.reject(new cli.errors.SystemError(`Failed to create zip file: ${error.message}`));
            }

            return Promise.resolve(saveLocation);
        })

    }
}

BackupCommand.description = 'Create a backup of your installation';
InstallCommand.options = {
    output: {
        alias: 'o',
        description: 'Folder to save backup in',
        type: 'string'
    }
};
module.exports = BackupCommand;
