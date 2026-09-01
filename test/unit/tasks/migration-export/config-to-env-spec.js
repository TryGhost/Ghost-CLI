const {configToEnv, sensitiveKeys} = require('../../../../lib/tasks/migration-export/config-to-env');

describe('Unit: Tasks > migration-export > config-to-env', function () {
    it('flattens nested config into section__key form', function () {
        const result = configToEnv({
            mail: {
                transport: 'SMTP',
                options: {host: 'smtp.example.com', port: 587}
            }
        });

        expect(result).to.deep.equal({
            mail__transport: 'SMTP',
            mail__options__host: 'smtp.example.com',
            mail__options__port: '587'
        });
    });

    it('excludes the sections that don\'t belong in a container', function () {
        const result = configToEnv({
            url: 'https://example.com',
            database: {client: 'mysql', connection: {password: 'hunter2'}},
            server: {port: 2368},
            logging: {transports: ['stdout']},
            process: 'systemd',
            paths: {contentPath: '/var/www/ghost/content'},
            mail: {transport: 'SMTP'}
        });

        expect(result).to.deep.equal({mail__transport: 'SMTP'});
    });

    it('stringifies arrays and booleans, and skips nullish values', function () {
        const result = configToEnv({
            privacy: {useGravatar: false},
            imageOptimization: {resize: true},
            adapters: {cache: null},
            extra: {list: ['a', 'b']}
        });

        expect(result).to.deep.equal({
            privacy__useGravatar: 'false',
            imageOptimization__resize: 'true',
            extra__list: '"[\\"a\\",\\"b\\"]"'
        });
    });

    it('quotes values containing spaces, newlines or quotes', function () {
        const result = configToEnv({
            mail: {from: 'Ghost Blog <noreply@example.com>'},
            other: {quoted: 'say "hi"', plain: 'plain'}
        });

        expect(result.mail__from).to.equal('"Ghost Blog <noreply@example.com>"');
        expect(result.other__quoted).to.equal('"say \\"hi\\""');
        expect(result.other__plain).to.equal('plain');
    });

    it('escapes backslashes inside quoted values', function () {
        // A value ending in a backslash would otherwise escape its own closing quote
        const result = configToEnv({
            mail: {options: {auth: {pass: 'ends with\\'}}},
            other: {mixed: 'pass\\word here', bare: 'pass\\word'}
        });

        expect(result.mail__options__auth__pass).to.equal('"ends with\\\\"');
        expect(result.other__mixed).to.equal('"pass\\\\word here"');
        // Unquoted values are passed through untouched, same as ghost-docker
        expect(result.other__bare).to.equal('pass\\word');
    });

    it('round-trips an array containing a backslash', function () {
        const {extra__list: encoded} = configToEnv({extra: {list: ['a\\b']}});

        // Undo the env-file quoting, then the JSON encoding
        const unquoted = encoded.slice(1, -1).replace(/\\(.)/g, '$1');
        expect(JSON.parse(unquoted)).to.deep.equal(['a\\b']);
    });

    it('handles an empty/missing config', function () {
        expect(configToEnv()).to.deep.equal({});
        expect(configToEnv({})).to.deep.equal({});
    });

    it('flags keys that look like secrets', function () {
        const keys = sensitiveKeys({
            mail__options__auth__pass: 'x',
            mail__options__auth__user: 'y',
            bulkEmail__mailgun__apiKey: 'z',
            mail__transport: 'SMTP'
        });

        expect(keys).to.deep.equal(['mail__options__auth__pass', 'bulkEmail__mailgun__apiKey']);
    });
});
