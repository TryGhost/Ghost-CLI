const fs = require('fs-extra');
const get = require('lodash/get');
const path = require('path');
const ini = require('ini');
const chalk = require('chalk');
const semver = require('semver');
const execa = require('execa');
const {errors} = require('../../lib');

const {SystemError} = errors;

const systemdEnabled =
    ({instance}) => instance.config.get('process', 'local') === 'systemd';

const unitCheckTitle = 'Checking systemd unit file';
const nodeCheckTitle = 'Checking systemd node version';

async function checkUnitFile(ctx) {
    const unitFilePath = `/lib/systemd/system/ghost_${ctx.instance.name}.service`;
    ctx.systemd = {unitFilePath};

    try {
        const contents = await fs.readFile(unitFilePath);
        ctx.systemd.unit = ini.parse(contents.toString('utf8').trim());
    } catch (error) {
        throw new SystemError({
            message: 'Unable to load or parse systemd unit file',
            err: error
        });
    }
}

async function checkNodeVersion({instance, systemd, ui}, task) {
    const errBlock = {
        message: 'Unable to determine node version in use by systemd',
        help: `Ensure 'ExecStart' exists in ${chalk.cyan(systemd.unitFilePath)} and uses a valid Node version`
    };

    const execStart = get(systemd, 'unit.Service.ExecStart', null);
    if (!execStart) {
        throw new SystemError(errBlock);
    }

    const [nodePath] = execStart.split(' ');
    let version;

    try {
        const stdout = await execa.stdout(nodePath, ['--version']);
        version = semver.valid(stdout.trim());
    } catch (_) {
        throw new SystemError(errBlock);
    }

    if (!version) {
        throw new SystemError(errBlock);
    }

    task.title = `${nodeCheckTitle} - found v${version}`;

    if (!semver.eq(version, process.versions.node)) {
        ui.log(
            `Warning: Ghost is running with node v${version}.\n` +
            `Your current node version is v${process.versions.node}.`,
            'yellow'
        );
    }

    let nodeRange;

    try {
        const packagePath = path.join(instance.dir, 'current/package.json');
        const ghostPkg = await fs.readJson(packagePath);
        nodeRange = get(ghostPkg, 'engines.node', null);
    } catch (_) {
        return;
    }

    if (!nodeRange) {
        return;
    }

    if (!semver.satisfies(version, nodeRange)) {
        throw new SystemError({
            message: `Ghost v${instance.version} is not compatible with Node v${version}`,
            help: `Check the version of Node configured in ${chalk.cyan(systemd.unitFilePath)} and update it to a compatible version`
        });
    }
}

module.exports = [{
    title: unitCheckTitle,
    task: checkUnitFile,
    enabled: systemdEnabled,
    category: ['start']
}, {
    title: nodeCheckTitle,
    task: checkNodeVersion,
    enabled: systemdEnabled,
    category: ['start']
}];

// exports for unit testing
module.exports.checkUnitFile = checkUnitFile;
module.exports.checkNodeVersion = checkNodeVersion;
