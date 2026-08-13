const js = require("@eslint/js");
const react = require("eslint-plugin-react");
const cypress = require("eslint-plugin-cypress");
const globals = require("globals");

module.exports = [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      "jsx-quotes": ["error", "prefer-double"],
      semi: ["error", "always"],
      "no-multiple-empty-lines": "error",
      "no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    files: ["cypress/**/*.js"],
    ...cypress.configs.recommended,
  },
];
