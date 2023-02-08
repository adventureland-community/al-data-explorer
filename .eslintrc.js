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
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
    ],
  },
};
