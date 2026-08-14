import {defineConfig, globalIgnores} from 'eslint/config';
import {FlatCompat} from '@eslint/eslintrc';
import ghost from 'eslint-plugin-ghost';
import js from '@eslint/js';
import globals from 'globals';

// eslint-plugin-ghost still ships eslintrc-style presets, so they need converting
const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
    recommendedConfig: js.configs.recommended
});

// eslint-plugin-ghost bundles old versions of eslint-plugin-filenames-ts and
// eslint-plugin-mocha, which use APIs eslint 9 removed. Those rules crash the
// linter, so drop them as the presets are converted.
const UNSUPPORTED_PREFIXES = ['ghost/filenames/', 'ghost/mocha/'];
const ghostPreset = name => compat.extends(`plugin:ghost/${name}`).map(config => (config.rules ? {
    ...config,
    rules: Object.fromEntries(Object.entries(config.rules).filter(
        ([rule]) => !UNSUPPORTED_PREFIXES.some(prefix => rule.startsWith(prefix))
    ))
} : config));

// the globals package doesn't ship a vitest set, and vitest.config.mjs turns globals on
const vitestGlobals = Object.fromEntries([
    'suite', 'test', 'describe', 'it', 'expect', 'assert', 'vi',
    'beforeAll', 'afterAll', 'beforeEach', 'afterEach', 'onTestFailed', 'onTestFinished'
].map(name => [name, 'readonly']));

const plugins = {ghost};
const base = {
    ...js.configs.recommended,
    plugins,
    extends: ghostPreset('node'),
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'commonjs',
        globals: {...globals.node}
    },
    rules: {
        ...js.configs.recommended.rules,
        'no-console': ['off'],
        // the CLI has its own errors in lib/errors.js, it doesn't use @tryghost/errors
        'ghost/ghost-custom/no-native-error': ['off'],
        'ghost/ghost-custom/ghost-error-usage': ['off'],
        // the preset expects index.js files to be thin re-exports, ours aren't
        'max-lines': ['off']
    }
};

export default defineConfig([
    globalIgnores(['**/node_modules/**', '**/coverage/**', '.claude/**']),
    {
        files: ['**/*.js'],
        ...base
    },
    {
        files: ['./bin/ghost'],
        ...base,
        languageOptions: {
            ...base.languageOptions,
            sourceType: 'script'
        }
    },
    {
        files: ['**/*.mjs'],
        ...base,
        languageOptions: {
            ...base.languageOptions,
            sourceType: 'module'
        }
    },
    {
        files: ['test/**/*.js', 'extensions/**/test/**/*.js'],
        ...base,
        extends: ghostPreset('test'),
        languageOptions: {
            ...base.languageOptions,
            globals: {...globals.node, ...vitestGlobals}
        },
        rules: {
            ...base.rules,
            // specs deliberately shadow the module under test when proxyquiring it
            'no-shadow': ['off']
        }
    }
]);
