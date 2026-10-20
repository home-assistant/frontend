import { defineConfig } from "@rslib/core";

// Bundleless build: every source file becomes its own ESM file so consumers'
// bundlers can tree-shake at component level. Custom elements register
// themselves when their module is evaluated, so only the modules a consumer
// actually imports end up in their bundle.
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
