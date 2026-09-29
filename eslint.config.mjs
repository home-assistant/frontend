// @ts-check

import { fileURLToPath } from "node:url";

import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";
import { configs as litConfigs } from "eslint-plugin-lit";
import { configs as wcConfigs } from "eslint-plugin-wc";
import { configs as a11yConfigs } from "eslint-plugin-lit-a11y";
import html from "@html-eslint/eslint-plugin";
import { importX } from "eslint-plugin-import-x";

const rspackConfigPath = fileURLToPath(
  new URL("./rspack.config.cjs", import.meta.url)
);

// Applies everywhere, including the files exempted from the history rule below.
const restrictedSyntax = ["LabeledStatement", "WithStatement"];

export default tseslint.config(
  tseslint.configs.base,
  litConfigs["flat/all"],
  wcConfigs["flat/recommended"],
  a11yConfigs.recommended,
  {
    plugins: {
      "import-x": importX,
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
          config: rspackConfigPath,
        },
      },
    },

    rules: {
      // Native rules live in .oxlintrc.json. Keep only the remaining checks here.
      "consistent-return": "error",
      curly: ["error", "multi-line"],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "guard-for-in": "error",
      "no-await-in-loop": "error",
      "no-control-regex": "error",
      "no-dupe-args": "error",
      "no-empty": "error",
      "no-global-assign": "error",
      "no-misleading-character-class": "error",
      "no-new-func": "error",
      "no-octal": "error",
      "no-octal-escape": "error",
      "no-prototype-builtins": "error",
      "no-return-assign": ["error", "always"],
      "no-script-url": "error",
      "no-self-compare": "error",
      "no-template-curly-in-string": "error",
      "no-undef": "error",
      "no-unreachable-loop": "error",
      "no-unsafe-optional-chaining": "error",
      "no-useless-return": "error",

      // TODO: Enable once violations are fixed (43 instances as of 2026-04)
      // "no-useless-assignment": "error",
      "no-useless-assignment": "error",

      // Project rules
      "no-bitwise": "error",
      "no-console": "error",
      "no-restricted-syntax": [
        "error",
        ...restrictedSyntax,
        {
          selector:
            "CallExpression[callee.property.name=/^(push|replace)State$/]",
          message:
            "Use navigate(), updateHistoryState() or replaceCurrentUrl() from common/navigate. History entries carry the app's own bookkeeping, which a raw pushState/replaceState drops.",
        },
      ],
      "wc/no-self-class": "off",

      // import-x rules without an Oxlint equivalent
      "import-x/order": [
        "error",
        { groups: [["builtin", "external", "internal"]] },
      ],
      "import-x/no-useless-path-segments": ["error", { commonjs: true }],
      "import-x/no-import-module-exports": ["error", { exceptions: [] }],
      "import-x/no-relative-packages": "error",

      // TypeScript rules
      "@typescript-eslint/array-type": "error",
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-namespace": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-shadow": ["error"],
      "@typescript-eslint/no-this-alias": "error",
      "@typescript-eslint/triple-slash-reference": "error",

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
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    rules: {
      "no-dupe-args": "off",
      "no-undef": "off",
      "no-var": "error",
    },
  },
  {
    // These own history entries themselves: the navigation helpers, the dialog
    // stack, the boot paths that run before the app has any state to keep, and
    // the tests that fabricate entries to simulate a document load.
    files: [
      "src/common/navigate.ts",
      "src/dialogs/make-dialog-manager.ts",
      "src/state/url-sync-mixin.ts",
      "src/panels/config/automation/add-automation-element-dialog.ts",
      "src/entrypoints/core.ts",
      "src/onboarding/**/*.ts",
      "cast/**/*.ts",
      "test/**/*.ts",
    ],
    rules: {
      "no-restricted-syntax": ["error", ...restrictedSyntax],
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
    files: ["test/e2e/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [".github/scripts/*.mjs"],
    languageOptions: {
      globals: globals.node,
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
