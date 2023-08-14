/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test|it).ts?(x)'],
};
