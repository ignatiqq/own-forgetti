module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  overrides: [
  ],
  extends: [
    "plugin:react/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  plugins: [
    "react"
  ],
  rules: {
    quotes: [
      "error",
      "double"
    ],
    semi: [
      "error",
      "always"
    ]
  }
};
