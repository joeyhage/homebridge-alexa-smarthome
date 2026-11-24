/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/test-setup.ts'],
  testMatch: ['**/?(*.)+(spec|test|it).ts?(x)'],
  // Source imports its own relative modules with an explicit `.js` suffix
  // (resolves fine against tsc's compiled `dist/`) but ts-jest compiles `.ts`
  // on the fly, so Jest needs this rewrite. Same fix as open PR #279.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
