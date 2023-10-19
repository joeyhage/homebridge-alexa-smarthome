/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/test-setup.ts'],
  testMatch: ['**/?(*.)+(spec|test|it).ts?(x)'],
};
