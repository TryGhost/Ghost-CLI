module.exports = async (ctx, task) => {
    const ky = require('ky').default;
    let releases;

    try {
        releases = await ky.get('https://api.github.com/repos/TryGhost/Ghost/releases', {timeout: 5000}).json();
    } catch {
        task.title = 'Unable to fetch release notes';
        return;
    }

    const relevantNotes = releases.find(note => note.tag_name.replace('v', '') === ctx.version);

    if (!relevantNotes) {
        task.title = 'Release notes were not found';
        return;
    }

    task.title = 'Fetched release notes';
    ctx.ui.log(`\n# ${relevantNotes.name}\n\n${relevantNotes.body}\n`, 'green');
};
