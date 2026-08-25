module.exports = {
  extends: ["@telokys/eslint-config-react-typescript"],
  rules: {
    "@typescript-eslint/no-empty-function": "off",
    "no-console": "off",
    "no-continue": "off",
    "no-empty": "off",
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "no-constant-condition": "off",
    "no-lonely-if": "off",
    // Keep in sync with .prettierrc — endOfLine lf is required on Windows
    // so Create React App's eslint-webpack overlay doesn't spam Delete `␍`.
    "prettier/prettier": [
      "error",
      {
        tabWidth: 2,
        singleQuote: false,
        printWidth: 100,
        trailingComma: "all",
        endOfLine: "lf",
      },
    ],
  },
};
