export const testEnvironment = 'node';
export const testMatch = [
    '**/tests/suites/**/*.test.js',
    '**/tests/**/*.test.js'
];
export const verbose = true;
export const testTimeout = 10000;
export const testPathIgnorePatterns = [
    '/node_modules/',
    '/runners/'
];
export const bail = false;