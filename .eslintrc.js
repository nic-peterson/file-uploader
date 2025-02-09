module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-var": "error",
    "prefer-const": "error",
    eqeqeq: ["error", "always"],
    curly: ["error", "all"],
    quotes: ["error", "single", { avoidEscape: true }],
    semi: ["error", "always"],
  },
};
