import path from 'node:path';
import {createRequire} from 'node:module';

// Vitest runs specs through vite-node, which never populates require.main. Several
// modules (and the specs covering them) read require.main.filename to work out which
// ghost-cli install they belong to, so point it at this checkout's executable.
const require = createRequire(import.meta.url);

if (!require.main) {
    process.mainModule = {filename: path.resolve(import.meta.dirname, '../bin/ghost')};
}
