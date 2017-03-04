module.exports = {
    full: {
        dirs: ['versions/1.0.0', 'config', 'content'],
        links: [
            ['versions/1.0.0', 'current'],
            ['content', 'current/content']
        ],
        files: [
            {
                path: 'versions/1.0.0/package.json',
                content: {
                    name: 'cli-testing',
                    version: '1.0.0'
                },
                json: true
            },
            {
                path: 'versions/1.0.0/index.js',
                content: ''
            },
            {
                path: '.ghost-cli',
                content: {
                    'cli-version': '0.0.1'
                },
                json: true
            }
        ]
    }
};
