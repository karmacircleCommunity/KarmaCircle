const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000/',
    specPattern: "**/*.spec.js",
    setupNodeEvents() {
      // implement node event listeners here
    },
  },
});
