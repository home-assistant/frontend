// @ts-check

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
import { configs as a11yConfigs } from "eslint-plugin-lit-a11y";
import html from "@html-eslint/eslint-plugin";
import importX from "eslint-plugin-import-x";

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);
const compat = new FlatCompat({
  baseDirectory: _dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// Load airbnb-base via FlatCompat for non-import rules only.
// eslint-plugin-import is incompatible with ESLint 10 (uses removed APIs),
// so we strip its plugin/rules/settings and use eslint-plugin-import-x instead.
const airbnbConfigs = compat.extends("airbnb-base").map((config) => {
  const { plugins = {}, rules = {}, settings = {}, ...rest } = config;
  return {
    ...rest,
    plugins: Object.fromEntries(
      Object.entries(plugins).filter(([key]) => key !== "import")
    ),
    rules: Object.fromEntries(
      Object.entries(rules).filter(([key]) => !key.startsWith("import/"))
    ),
    settings: Object.fromEntries(
      Object.entries(settings).filter(([key]) => !key.startsWith("import/"))
    ),
  };
});

export default tseslint.config(
  ...airbnbConfigs,
  eslintConfigPrettier,
  litConfigs["flat/all"],
  tseslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  wcConfigs["flat/recommended"],
  a11yConfigs.recommended,
  importX.flatConfigs.recommended,
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

    settings: {
      "import-x/resolver": {
        webpack: {
          config: "./rspack.config.cjs",
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
      "no-restricted-syntax": ["error", "LabeledStatement", "WithStatement"],
      "object-curly-newline": "off",
      "default-case": "off",
      "wc/no-self-class": "off",
      "no-shadow": "off",
      "no-use-before-define": "off",

      // import-x rules (migrated from eslint-plugin-import / airbnb-base)
      "import-x/named": "off",
      "import-x/prefer-default-export": "off",
      "import-x/no-default-export": "off",
      "import-x/no-unresolved": "off",
      "import-x/no-cycle": "off",
      "import-x/extensions": [
        "error",
        "ignorePackages",
        {
          ts: "never",
          js: "never",
        },
      ],
      "import-x/no-mutable-exports": "error",
      "import-x/no-amd": "error",
      "import-x/first": "error",
      "import-x/order": [
        "error",
        { groups: [["builtin", "external", "internal"]] },
      ],
      "import-x/newline-after-import": "error",
      "import-x/no-absolute-path": "error",
      "import-x/no-dynamic-require": "error",
      "import-x/no-webpack-loader-syntax": "error",
      "import-x/no-named-default": "error",
      "import-x/no-self-import": "error",
      "import-x/no-useless-path-segments": ["error", { commonjs: true }],
      "import-x/no-import-module-exports": ["error", { exceptions: [] }],
      "import-x/no-relative-packages": "error",

      // TypeScript rules
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
    },
  },
  {
    files: ["src/util/recorder-worklet.js"],
    languageOptions: {
      globals: globals.audioWorklet,
    },
  },
  {
    files: ["src/entrypoints/service-worker.ts"],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
  {
    plugins: {
      html,
    },
    rules: {
      "html/no-invalid-attr-value": "error",
    },
  }
);
