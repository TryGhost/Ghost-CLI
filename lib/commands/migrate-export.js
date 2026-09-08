const Command = require('../command');

const SUPPORTED_MAJOR = 6;

const BETA_NOTICE = 'WARNING: migration export is in beta. Make sure you have a backup before continuing.\n\n' +
    'This command reads your install and writes a portable bundle elsewhere. It does not modify or\n' +
    'delete the source install, so the original site stays exactly where it is. Ghost will be stopped\n' +
    'while the export runs, then restarted if it was running to begin with.';

class MigrateExportCommand extends Command {
    async run(argv) {
        const semver = require('semver');
        const getInstance = require('../utils/get-instance');
        const migrationExport = require('../tasks/migration-export');
        const {databaseKind} = require('../tasks/migration-export/database');
        const {SystemError} = require('../errors');

        this.ui.log(BETA_NOTICE, 'yellow');

        // `ui.confirm` returns the default when prompting is off, so `--no-prompt`
        // aborts unless the operator has explicitly opted in with `--force`
        const confirmed = argv.force || await this.ui.confirm('Ready to proceed with the migration export?', false);

        if (!confirmed) {
            this.ui.log('Migration export cancelled', 'yellow');
            return;
        }

        // getInstance chdirs into the instance, so remember where the operator ran from
        const cwd = process.cwd();

        const instance = getInstance({
            name: argv.name,
            system: this.system,
            command: 'migrate-export',
            recurse: !argv.dir
        });

        instance.checkEnvironment();

        // The bundle format is only vetted against Ghost 6.x. Older majors have
        // different config and content layouts, so refuse rather than emit a
        // bundle the importer can't safely consume.
        if (!instance.version || semver.major(instance.version) !== SUPPORTED_MAJOR) {
            throw new SystemError(`Migration export only supports Ghost ${SUPPORTED_MAJOR}.x installs. This instance is running Ghost ${instance.version || 'an unknown version'}.`);
        }

        const kind = databaseKind(instance);
        const isRunning = await instance.isRunning();

        // A portable export goes through Ghost's admin API, so the instance has to be up
        if (kind === 'portable' && !isRunning) {
            const shouldStart = await this.ui.confirm('Ghost instance is not currently running. Would you like to start it?', true);

            if (!shouldStart) {
                throw new SystemError('Ghost instance is not currently running');
            }

            await this.ui.run(() => instance.start(), 'Starting Ghost');
        }

        const {path: bundlePath, manifest, secrets} = await migrationExport(this.ui, instance, {
            output: argv.output,
            archive: argv.archive,
            cwd
        });

        if (secrets.length) {
            this.ui.log(`The bundle's config contains values that look like secrets (${secrets.join(', ')}). ` +
                'Treat it as sensitive and remove it once the import is done.', 'yellow');
        }

        this.ui.log(`Migration bundle (${manifest.database.kind}) saved to ${bundlePath}`, 'green');
    }
}

MigrateExportCommand.description = 'Export a Ghost 6.x instance as a portable migration bundle';
MigrateExportCommand.params = '[name]';
MigrateExportCommand.global = true;
MigrateExportCommand.options = {
    output: {
        alias: 'o',
        description: 'Path of the bundle to create',
        type: 'string'
    },
    archive: {
        description: 'Compress the bundle into a single archive',
        type: 'string',
        choices: ['tgz', 'zip']
    },
    force: {
        alias: 'f',
        description: 'Skip the beta confirmation prompt (required with --no-prompt)',
        type: 'boolean',
        default: false
    }
};

module.exports = MigrateExportCommand;
