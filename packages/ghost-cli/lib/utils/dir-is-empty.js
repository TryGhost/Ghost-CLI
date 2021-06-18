const fs = require('fs');

const debugLogRegex = /^ghost-cli-debug-.*\.log$/i;
const importantDotfiles = ['.ghost-cli'];

module.exports = function dirIsEmpty(dir) {
    const files = fs.readdirSync(dir);

    if (!files.length) {
        return true;
    }

    return files.every(file => file.match(debugLogRegex) || (file.startsWith('.') && !importantDotfiles.includes(file)));
};
