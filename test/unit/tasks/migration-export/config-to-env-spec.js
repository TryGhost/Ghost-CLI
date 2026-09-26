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
            extra__list: '["a","b"]'
        });
    });

    it('preserves raw special characters and JSON arrays', function () {
        const values = [' spaces ', 'dollar $VAR ${VAR} $$', 'hash #', 'say "hi"', 'single\'quote', 'line1\nline2', 'tab\there', 'back\\slash', 'ends with\\', ''];
        for (const value of values) {
            expect(configToEnv({mail: {from: value}}).mail__from).to.equal(value);
        }
        expect(JSON.parse(configToEnv({extra: {list: values}}).extra__list)).to.deep.equal(values);
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
