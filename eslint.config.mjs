import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends(
    "airbnb-base",
    "airbnb-typescript/base",
    "plugin:@typescript-eslint/recommended",
    "plugin:wc/recommended",
    "plugin:lit/all",
    "plugin:lit-a11y/recommended",
    "prettier"
  ),
  {
    plugins: {
      "unused-imports": unusedImports,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        __DEV__: false,
        __DEMO__: false,
        __BUILD__: false,
        __VERSION__: false,
        __STATIC_PATH__: false,
        __SUPERVISOR__: false,
        Polymer: true,
      },

      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          modules: true,
        },

        project: "./tsconfig.json",
      },
    },

    settings: {
      "import/resolver": {
        webpack: {
          config: "./webpack.config.cjs",
        },
      },
    },

    rules: {
      "class-methods-use-this": "off",
      "new-cap": "off",
      "prefer-template": "off",
      "object-shorthand": "off",
      "func-names": "off",
      "no-underscore-dangle": "off",
      strict: "off",
      "no-plusplus": "off",
      "no-bitwise": "error",
      "comma-dangle": "off",
      "vars-on-top": "off",
      "no-continue": "off",
      "no-param-reassign": "off",
      "no-multi-assign": "off",
      "no-console": "error",
      radix: "off",
      "no-alert": "off",
      "no-nested-ternary": "off",
      "prefer-destructuring": "off",
      "no-restricted-globals": [2, "event"],
      "prefer-promise-reject-errors": "off",
      "import/prefer-default-export": "off",
      "import/no-default-export": "off",
      "import/no-unresolved": "off",
      "import/no-cycle": "off",

      "import/extensions": [
        "error",
        "ignorePackages",
        {
          ts: "never",
          js: "never",
        },
      ],

      "no-restricted-syntax": ["error", "LabeledStatement", "WithStatement"],
      "object-curly-newline": "off",
      "default-case": "off",
      "wc/no-self-class": "off",
      "no-shadow": "off",
      "@typescript-eslint/camelcase": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-shadow": ["error"],

      "@typescript-eslint/naming-convention": [
        "off",
        {
          selector: "default",
          format: ["camelCase", "snake_case"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: ["variable"],
          format: ["camelCase", "snake_case", "UPPER_CASE"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
      ],

      "@typescript-eslint/no-unused-vars": "off",

      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      "unused-imports/no-unused-imports": "error",
      "lit/attribute-names": "warn",
      "lit/attribute-value-entities": "off",
      "lit/no-template-map": "off",
      "lit/no-native-attributes": "warn",
      "lit/no-this-assign-in-render": "warn",
      "lit-a11y/click-events-have-key-events": ["off"],
      "lit-a11y/no-autofocus": "off",
      "lit-a11y/alt-text": "warn",
      "lit-a11y/anchor-is-valid": "warn",
      "lit-a11y/role-has-required-aria-attrs": "warn",
    },
  },
];
