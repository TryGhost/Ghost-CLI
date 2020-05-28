const fs = require('fs-extra');
const path = require('path');

async function saveNodeExecPath({instance}) {
    const serviceFilename = `ghost_${instance.name}.service`;
    const fullFilePath = path.resolve(instance.dir, './system/files', serviceFilename);

    const fileContents = await fs.readFile(fullFilePath, 'utf8');

    const nodeBinaryLine = fileContents.split('\n').find(line => line.startsWith('ExecStart'));
    // The line will look like this: ExecStart=/usr/bin/node /usr/bin/ghost run
    const [, execCommand] = nodeBinaryLine.split('=');

    instance.nodeBinary = execCommand.trim().split(' ').shift();
}

module.exports = {
    saveNodeExecPath
};
