'use strict';

const Command = require('../command');
const fs = require('fs-extra');
const path = require('path');

const CliError = require('../errors').CliError;

class BackupCommand extends Command {
    run(argv) {
        const backupsPath = path.join(process.cwd(), '/backups');
        const backupType = argv.type.toLowerCase();
        const validTypes = [
            'full',
            'database',
            'files'
        ];

        if (validTypes.indexOf(backupType) === -1) {
            return Promise.reject(new CliError('Invalid backup type'));
        }

        // Create backups directory if it does not exists
        if (!fs.existsSync(backupsPath)) {
            fs.mkdirSync(backupsPath);
        }

        // Creating an unique file name based on the current date
        const date = new Date();
        const backupPrefix = [
            ('0' + date.getFullYear()).slice(-2),
            ('0' + (date.getMonth() + 1)).slice(-2),
            ('0' + date.getDate()).slice(-2),
            ('0' + date.getHours()).slice(-2),
            ('0' + date.getMinutes()).slice(-2),
            ('0' + date.getSeconds()).slice(-2)
        ].join('');

        // Start building backups array
        let backups = [];
        if (['full', 'database'].indexOf(backupType) !== -1) {
            backups.push(this.backupDB(backupsPath, backupPrefix));
        }
        if (['full', 'files'].indexOf(backupType) !== -1) {
            backups.push(this.backupFiles(backupsPath, backupPrefix));
        }

        return Promise.all(backups);
    }

    backupDB(backupsPath, backupPrefix) {
        return new Promise((resolve, reject) => {
            const instance = this.system.getInstance();
            const absoluteBackupFilename = path.join(backupsPath, backupPrefix);

            if (instance.config.get('database.client') === 'mysql') {
                return this.backupMySQL(instance, absoluteBackupFilename);
            }

            if (instance.config.get('database.client') === 'sqlite3') {
                return this.backupSQLite3(instance, absoluteBackupFilename);
            }

            reject(new CliError('Database client not supported'));
        });
    }

    backupFiles(backupsPath, backupPrefix) {
        return new Promise((resolve, reject) => {
            const archiver = require('archiver');

            const instance = this.system.getInstance();
            const outputFileName = path.join(backupsPath, backupPrefix) + '.zip';

            const output = fs.createWriteStream(outputFileName);
            const archive = archiver('zip', {
                zlib: {level: 9}
            });

            output.on('close', () => {
                this.ui.log('Your files backup is ready at: ' + outputFileName, 'green');

                resolve();
            });
            output.on('error', error => reject(new CliError(error)));

            archive.pipe(output);
            archive.directory(instance.config.get('paths.contentPath'), false);
            archive.finalize();
        });
    }

    backupMySQL(instance, absoluteBackupPrefix) {
        const mysqldump = require('mysqldump');
        const outputFileName = absoluteBackupPrefix + '.sql';

        return mysqldump({
            connection: {
                host: instance.config.get('database.connection.host'),
                user: instance.config.get('database.connection.user'),
                password: instance.config.get('database.connection.password'),
                database: instance.config.get('database.connection.database')
            },
            dumpToFile: outputFileName
        })
            .then(() => this.ui.log('Your database backup is ready at: ' + outputFileName, 'green'));
    }

    backupSQLite3(instance, absoluteBackupPrefix) {
        return new Promise((resolve) => {
            const absoluteDBFileName = path.join(process.cwd(), instance.config.get('database.connection.filename'));
            const outputFileName = absoluteBackupPrefix + '.db';

            fs.createReadStream(absoluteDBFileName).pipe(fs.createWriteStream(outputFileName));

            this.ui.log('Your database backup is ready at: ' + outputFileName, 'green');

            resolve();
        });
    }
}

BackupCommand.global = false;
BackupCommand.description = 'Backup an instance of Ghost';
BackupCommand.options = {
    type: {
        alias: 't',
        description: 'Type of backup: full, database or files',
        type: 'string',
        default: 'full'
    }
};

module.exports = BackupCommand;
