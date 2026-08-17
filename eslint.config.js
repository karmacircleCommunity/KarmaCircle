const js = require("@eslint/js");
const react = require("eslint-plugin-react");
const cypress = require("eslint-plugin-cypress");
const globals = require("globals");
const tseslint = require("typescript-eslint");
const tailwindcss = require("eslint-plugin-tailwindcss");

const tsRecommended = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: ["**/*.{ts,tsx}"],
}));

module.exports = [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    ...react.configs.flat.recommended,
    files: ["**/*.{js,jsx,ts,tsx}"],
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
  ...tsRecommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Superseded by the TS-aware version below, which understands
      // types (e.g. imports only used in a type position).
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["cypress/**/*.js"],
    ...cypress.configs.recommended,
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      tailwindcss,
    },
    settings: {
      tailwindcss: {
        cssConfigPath: "./src/styles/index.css",
      },
    },
    rules: {
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/enforces-shorthand": "warn",
      "tailwindcss/enforces-negative-arbitrary-values": "warn",
      "tailwindcss/important-modifier-suffix": "warn",
      "tailwindcss/no-contradicting-classname": "error",
      "tailwindcss/no-unnecessary-arbitrary-value": "warn",
    },
  },
];
