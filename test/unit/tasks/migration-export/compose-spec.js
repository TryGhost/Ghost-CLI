const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {configToEnv} = require('../../../../lib/tasks/migration-export/config-to-env');

// Opt in with a checkout of ghost-docker's next contract. This deliberately uses
// its real serializer, not a second encoding implementation in Ghost-CLI.
const dockerDir = process.env.GHOST_DOCKER_DIR;
describe.skipIf(!dockerDir)('Integration: migration config through real Compose', function () {
    it('delivers raw exporter values verbatim to a container', function () {
        for (const kind of ['mysql-dump', 'portable']) {
            const fixture = require(`../../../fixtures/migration-bundle-v1/${kind}.json`);
            expect(JSON.parse(fs.readFileSync(path.join(dockerDir, 'tests/fixtures/migration-bundle-v1', `${kind}.json`)))).to.deep.equal(fixture);
        }
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-compose-'));
        const values = [' spaces  ', '$VAR ${VAR} $$ $', 'hash # value', 'say "hi"', 'single\'quote', 'back\\slash', 'ends\\', 'line1\nline2', 'tab\there', '', '["a","b"]'];
        const config = configToEnv({probe: Object.fromEntries(values.map((value, i) => [`v${i}`, value]))});
        const composeArgs = ['compose', '--project-directory', dir, '-f', path.join(dir, 'compose.yml')];
        try {
            for (const [key, value] of Object.entries(config)) {
                execFileSync('bash', ['-c', 'source "$1/scripts/lib/fs.sh"; source "$1/scripts/lib/env.sh"; env_set "$2" "$3" "$4"', 'bash', dockerDir, path.join(dir, 'ghost.env'), key, value]);
            }
            fs.writeFileSync(path.join(dir, 'compose.yml'), JSON.stringify({services: {probe: {
                image: 'alpine:3.20',
                env_file: ['./ghost.env'],
                volumes: ['./probe.sh:/probe.sh:ro'],
                command: ['sh', '/probe.sh']
            }}}), {mode: 0o600});
            fs.writeFileSync(path.join(dir, 'probe.sh'), Object.keys(config).map(key => `printf '%s' "$${key}" | base64 | tr -d '\\n'; printf '\\n'`).join('\n'), {mode: 0o600});
            const output = execFileSync('docker', [...composeArgs, 'run', '--rm', '--no-deps', '-T', 'probe'], {encoding: 'utf8', env: {...process.env, VAR: 'MUST_NOT_INTERPOLATE'}});
            const seen = output.replace(/\n$/, '').split('\n').map(value => Buffer.from(value, 'base64').toString());
            expect(seen).to.deep.equal(values);
        } finally {
            try {
                if (fs.existsSync(path.join(dir, 'compose.yml'))) {
                    execFileSync('docker', [...composeArgs, 'down', '--remove-orphans']);
                }
            } finally {
                fs.rmSync(dir, {recursive: true, force: true});
            }
        }
    }, 60000);
});
