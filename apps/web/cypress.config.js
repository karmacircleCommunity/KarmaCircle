const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000/",
    // Off for normal runs — a recording per run is 20MB of noise nobody
    // asked for. The walkthrough script (npm run cypress:walkthrough)
    // turns it back on for the one spec that exists to be watched.
    video: false,
    specPattern: "cypress/e2e/**/*.spec.js",
    // The local API the local frontend is already pointed at (.env's
    // VITE_API_URL). Previously these specs called the *production* API
    // from a developer's machine; overridable with CYPRESS_apiUrl.
    env: {
      apiUrl: "http://localhost:5050",
    },
    setupNodeEvents() {
      // implement node event listeners here
    },
  },
});
