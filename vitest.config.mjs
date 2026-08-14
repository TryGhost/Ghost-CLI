import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        include: ['test/unit/**/*-spec.js', 'extensions/*/test/**/*-spec.js'],
        setupFiles: ['./test/setup.mjs'],
        testTimeout: 5000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'cobertura'],
            include: ['bin/**', 'lib/**', 'extensions/**'],
            exclude: ['extensions/*/test/**']
        }
    }
});
