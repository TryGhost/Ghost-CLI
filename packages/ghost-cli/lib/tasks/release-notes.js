module.exports = async (ctx, task) => {
    const got = require('got');
    let response;

    try {
        response = await got.get('https://api.github.com/repos/TryGhost/Ghost/releases', {json: true, timeout: 5000});
    } catch (err) {
        task.title = 'Unable to fetch release notes';
        return;
    }

    const relevantNotes = response.body.find(note => note.tag_name.replace('v', '') === ctx.version);

    if (!relevantNotes) {
        task.title = 'Release notes were not found';
        return;
    }

    task.title = 'Fetched release notes';
    ctx.ui.log(`\n# ${relevantNotes.name}\n\n${relevantNotes.body}\n`, 'green');
};
