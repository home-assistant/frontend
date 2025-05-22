// @ts-check

import tseslint from "typescript-eslint";
import rootConfig from "../eslint.config.mjs";

export default tseslint.config(...rootConfig, {
  rules: {
    "no-console": "off",
    "import/no-extraneous-dependencies": "off",
    "import/extensions": "off",
    "import/no-dynamic-require": "off",
    "global-require": "off",
    "@typescript-eslint/no-require-imports": "off",
    "prefer-arrow-callback": "off",
  },
});
