'use strict';
const Command = require('../command');

class CloneTheme extends Command {
    run(argv) {
        const decompress = require('decompress');
        const download = require('download');
        const fs = require('fs-extra');
        const path = require('path');
        const slugify = require('slugify');

        const currentPath = process.cwd();
        const temporalZipFilename = Math.random().toString(36).substr(2, 9) + '.zip';
        const friendlyThemeName = slugify(argv.name);

        // Consider current path as "themes" folder, overide if needed
        // with the logic in the next conditions
        let workingPath = currentPath;
        if (currentPath.endsWith('/content')) { // If working path is ghost/content folder
            workingPath = path.join(currentPath, '/themes');
        } else if (fs.existsSync(path.join(currentPath, '/content/themes'))) { // If working path is ghost root folder
            workingPath = path.join(currentPath, '/content/themes');
        }

        const themePath = path.join(workingPath, friendlyThemeName);

        // Check if directory exists
        if (fs.existsSync(themePath)) {
            // Check if there are existing files that *aren't* ghost-cli debug log files
            const filesInDir = fs.readdirSync(themePath);

            // If so then return an error
            if (filesInDir.length) {
                this.ui.log('ERROR: Target directory is not empty, the new theme cannot be installed in the desired path.', 'red');

                process.exit(1);
            }
        }

        this.ui.log('Downloading base theme, this may take some time...', 'green');

        return download(argv.source, workingPath, {filename: temporalZipFilename})
            .then(() => {
                this.ui.log('"Unziping" base theme...', 'green');

                return decompress(temporalZipFilename, friendlyThemeName, {strip: 1});
            }).then(() => {
                const packageJsonFile = path.join(themePath, '/package.json');
                let packageJsonConfig = require(packageJsonFile);

                packageJsonConfig.name = friendlyThemeName;
                packageJsonConfig.version = '0.0.1';
                fs.writeFileSync(packageJsonFile, JSON.stringify(packageJsonConfig, null, '    '), (err) => {
                    if (err) throw err;
                });

                this.ui.log('All set, happy coding!', 'green');
            }).catch((error) => {
                this.ui.log(error, 'red');
            }).then(() => {
                if (fs.existsSync(path.join(workingPath, temporalZipFilename))) {
                    fs.unlink(path.join(workingPath, temporalZipFilename));
                }

                process.exit(1);
            });
    }
}

CloneTheme.global = true;
CloneTheme.description = 'Clones a theme so you to get started and modify or create your own Ghost theme from other';
CloneTheme.options = {
    name: {
        alias: 'n',
        description: 'Desired name for your new theme',
        required: true,
        type: 'string'
    },
    source: {
        alias: 's',
        default: 'https://github.com/TryGhost/Casper/archive/master.zip',
        description: 'URL (must be a .zip file) to pull the base theme from',
        type: 'string'
    },
};

module.exports = CloneTheme;
