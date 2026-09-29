// @ts-check

import globals from "globals";
import tseslint from "typescript-eslint";
import rootConfig from "../eslint.config.mjs";

export default tseslint.config(...rootConfig, {
  languageOptions: {
    globals: globals.node,
  },
  rules: {
    "no-console": "off",
    "import-x/no-extraneous-dependencies": "off",
    "global-require": "off",
    "@typescript-eslint/no-require-imports": "off",
  },
});
