/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  globalSetup: "<rootDir>/tests/helpers/global.setup.ts",
  setupFiles: ["<rootDir>/tests/helpers/env.setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/helpers/jest.setup.ts"],
  testTimeout: 30000,
  clearMocks: true,
};
