import { defineConfig } from "@rslib/core";

// Bundleless build: every source file becomes its own ESM file, so consumers'
// bundlers only include the entry points they import. Only global.ts files
// register elements; everything else is free of side effects.
export default defineConfig({
  source: {
    entry: { index: ["./src/**/*.ts"] },
    decorators: { version: "legacy" },
    tsconfigPath: "./tsconfig.json",
  },
  tools: {
    swc: { jsc: { transform: { decoratorMetadata: false } } },
  },
  lib: [
    {
      format: "esm",
      bundle: false,
      syntax: "es2021",
      dts: true,
      output: { target: "web", distPath: { root: "./dist" } },
    },
  ],
});
