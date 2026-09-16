/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/test-setup.ts'],
  testMatch: ['**/?(*.)+(spec|test|it).ts?(x)'],
  // Source imports its own relative modules with an explicit `.js` suffix
  // (resolves fine against tsc's compiled `dist/`, which really has
  // `.js` files) but ts-jest compiles `.ts` on the fly and never produces
  // that file, so Jest can't resolve it without this rewrite.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
