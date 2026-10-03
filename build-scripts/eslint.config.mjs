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
    "import-x/extensions": "off",
    "import-x/no-dynamic-require": "off",
    "global-require": "off",
    "@typescript-eslint/no-require-imports": "off",
    "prefer-arrow-callback": "off",
  },
});
