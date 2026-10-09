const Command = require('../command');

const SUPPORTED_MAJOR = 6;
// The first release published as a `-next` ghost Docker image (amd64 and
// arm64). Imports run at the exact exported version, so older sources would
// have no image to restore into.
const MINIMUM_VERSION = '6.61.0';

const BETA_NOTICE =
    'WARNING: migration export is in beta. Make sure you have a backup before continuing.\n\n' +
    'This command reads your install and writes a portable bundle elsewhere. It does not modify or\n' +
    'delete the source install, so the original site stays exactly where it is. Ghost will be stopped\n' +
    'while files are copied. Ordinary exports restore the original running state.\n' +
    '--leave-stopped keeps Ghost stopped for cutover, including after export failure.';

class MigrateExportCommand extends Command {
    async run(argv) {
        const semver = require('semver');
        const getInstance = require('../utils/get-instance');
        const migrationExport = require('../tasks/migration-export');
        const {SystemError} = require('../errors');

        this.ui.log(BETA_NOTICE, 'yellow');

        // `ui.confirm` returns the default when prompting is off, so `--no-prompt`
        // aborts unless the operator has explicitly opted in with `--force`
        const confirmed = argv.force || (await this.ui.confirm('Ready to proceed with the migration export?', false));

        if (!confirmed) {
            this.ui.log('Migration export cancelled', 'yellow');
            return;
        }

        // _run captures cwd before --dir; direct run() calls still capture it
        // here before getInstance selects an installation.
        const cwd = this.invocationCwd || process.cwd();

        const instance = getInstance({
            name: argv.name,
            system: this.system,
            command: 'migrate-export',
            recurse: !argv.dir
        });

        instance.checkEnvironment();

        // The bundle format is only vetted against Ghost 6.x, and the importer
        // needs a `-next` image of the exact source version. Refuse before
        // anything is stopped or written.
        if (
            !instance.version ||
            semver.major(instance.version) !== SUPPORTED_MAJOR ||
            semver.lt(instance.version, MINIMUM_VERSION)
        ) {
            throw new SystemError({
                message: `Migration export requires Ghost ${MINIMUM_VERSION} or a later ${SUPPORTED_MAJOR}.x release. This instance is running Ghost ${instance.version || 'an unknown version'}.`,
                help: `Run \`ghost update\`, check the site works, then run \`ghost migrate-export\` again.`
            });
        }

        const {
            path: bundlePath,
            manifest,
            secrets,
            linkedThemes
        } = await migrationExport(this.ui, instance, {
            output: argv.output,
            archive: argv.archive,
            leaveStopped: argv.leaveStopped,
            sqliteFormat: argv.sqliteFormat,
            cwd
        });

        if (secrets.length) {
            this.ui.log(
                `The bundle's config contains values that look like secrets (${secrets.join(', ')}). ` +
                    'Treat it as sensitive and remove it once the import is done.',
                'yellow'
            );
        }

        for (const theme of linkedThemes) {
            this.ui.log(
                `Theme "${theme.name}" is linked to ${theme.source}. The bundle holds a copy, so edits there ` +
                    "won't reach the imported site. To keep developing it, mount the folder with a " +
                    'compose.override.yml (see "Your own Compose overrides" in the ghost-docker docs).',
                'yellow'
            );
        }

        this.ui.log(`Migration bundle (${manifest.kind}) saved to ${bundlePath}`, 'green');

        // ghost-docker only imports local mysql bundles so far; portable bundles go
        // through Ghost Admin and production imports aren't supported yet. The port
        // check keeps a malformed config value out of a command meant to be copied.
        const port = Number(instance.config.get('server.port', 2368));
        if (
            manifest.sourceInstallType === 'local' &&
            manifest.kind !== 'portable' &&
            Number.isInteger(port) &&
            port > 0
        ) {
            const importPath = /^[\w@%+=:,./-]+$/.test(bundlePath)
                ? bundlePath
                : `'${bundlePath.replace(/'/g, "'\\''")}'`;

            this.ui.log(
                'To move this site to Docker, stop it with `ghost stop`, then run this from a new, empty ' +
                    `directory outside the site:\n\n` +
                    `  curl -fsSL https://docker.ghost.org/install.sh | bash -s -- install --import ${importPath} --port ${port}\n\n` +
                    'See https://docker.ghost.org for details.'
            );
        }
    }
}

MigrateExportCommand.description = 'Export a Ghost 6.61.0+ instance as a portable migration bundle';
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
    'sqlite-format': {
        description:
            'How a SQLite database travels: mysql-data (every row, as MySQL INSERTs) or portable (Ghost content export + members CSV)',
        type: 'string',
        choices: ['mysql-data', 'portable']
    },
    'leave-stopped': {
        description: 'Leave Ghost stopped for cutover, even if export fails; recover with ghost start',
        type: 'boolean',
        default: false
    },
    force: {
        alias: 'f',
        description: 'Skip the beta confirmation prompt (required with --no-prompt)',
        type: 'boolean',
        default: false
    }
};

module.exports = MigrateExportCommand;
