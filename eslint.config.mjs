// @ts-check

/* eslint-disable import/no-extraneous-dependencies */
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import { configs as litConfigs } from "eslint-plugin-lit";
import { configs as wcConfigs } from "eslint-plugin-wc";

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);
const compat = new FlatCompat({
  baseDirectory: _dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default tseslint.config(
  ...compat.extends("airbnb-base", "plugin:lit-a11y/recommended"),
  eslintConfigPrettier,
  litConfigs["flat/all"],
  tseslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  wcConfigs["flat/recommended"],
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
      },

      parser: tseslint.parser,
      ecmaVersion: 2020,
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          modules: true,
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
        "error",
        {
          selector: ["objectLiteralProperty", "objectLiteralMethod"],
          format: null,
        },
        {
          selector: ["variable"],
          format: ["camelCase", "snake_case", "UPPER_CASE"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: ["variable"],
          modifiers: ["exported"],
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "method",
          modifiers: ["public"],
          format: ["camelCase"],
          leadingUnderscore: "forbid",
        },
        {
          selector: "method",
          modifiers: ["private"],
          format: ["camelCase"],
          leadingUnderscore: "require",
        },
      ],

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      "unused-imports/no-unused-imports": "error",
      "lit/attribute-names": "error",
      "lit/attribute-value-entities": "off",
      "lit/no-template-map": "off",
      "lit/no-native-attributes": "error",
      "lit/no-this-assign-in-render": "error",
      "lit-a11y/click-events-have-key-events": ["off"],
      "lit-a11y/no-autofocus": "off",
      "lit-a11y/alt-text": "error",
      "lit-a11y/anchor-is-valid": "error",
      "lit-a11y/role-has-required-aria-attrs": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      camelcase: "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-empty-object-type": [
        "error",
        {
          allowInterfaces: "always",
          allowObjectTypes: "always",
        },
      ],
      "no-use-before-define": "off",
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".ts", ".js"],
        },
      },
    },
  }
);
