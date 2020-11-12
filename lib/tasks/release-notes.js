module.exports = async (ctx, task) => {
    const got = require('got');
    let response;

    try {
        response = await got('https://api.github.com/repos/TryGhost/Ghost/releases', {json: true});
    } catch (err) {
        task.title = 'Unable to fetch release notes';
        return;
    }

    const relevantNotes = response.body.filter(note => note.tag_name === ctx.version)[0];

    if (!relevantNotes) {
        task.title = 'Release notes were not found';
        return;
    }

    task.title = 'Fetched release notes';
    ctx.ui.log(`\n${relevantNotes.body}\n`, 'green');
};
