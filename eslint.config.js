/**
 * Prometheus – ESLint + Prettier Configuration (DEV-003)
 * Flat config format compatible with ESLint 9.x
 */
import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                Blob: 'readonly',
                Worker: 'readonly',
                IntersectionObserver: 'readonly',
                HTMLElement: 'readonly',
                HTMLCanvasElement: 'readonly',
                performance: 'readonly',
                requestAnimationFrame: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                ArrayBuffer: 'readonly',
                Float64Array: 'readonly',
                Int16Array: 'readonly',
                Intl: 'readonly',
                self: 'readonly',
                queueMicrotask: 'readonly',
                structuredClone: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-console': 'off',
            'prefer-const': 'warn',
            'no-var': 'error',
            'eqeqeq': ['error', 'smart'],
            'no-throw-literal': 'error',
            'no-duplicate-imports': 'error',
            'no-template-curly-in-string': 'warn',
        },
    },
    {
        // Test files
        files: ['src/__tests__/**/*.js', '**/*.test.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                vi: 'readonly',
            },
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
];
