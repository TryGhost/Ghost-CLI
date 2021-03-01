// @ts-check
const fs = require('fs');

const environmentExtractor = /config\.(.*)\.json/;

/**
 * @param {string} cwd the directory to search
 * @returns {string[]} list of environments discovered
 */
module.exports = function discoverEnvironments(cwd) {
    const environments = [];
    const directoryContents = fs.readdirSync(cwd);

    for (const entry of directoryContents) {
        const matchResult = environmentExtractor.exec(entry);

        if (matchResult) {
            environments.push(matchResult[1]);
        }
    }

    const weights = {'production': 2, 'development': 1};

    return environments.sort((a, b) => {
        const aWeight = weights[a] || 0;
        const bWeight = weights[b] || 0;
        return bWeight - aWeight;
    });
};
