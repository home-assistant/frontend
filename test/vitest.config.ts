import { defaultClientConditions } from "vite";
import { defineConfig, configDefaults } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Resolve @home-assistant/components entry points to their sources, like the
// app build and tsconfig.json, so the package needs no build to run tests
const SOURCE_CONDITION = "ha-source";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    conditions: [SOURCE_CONDITION, ...defaultClientConditions],
  },
  test: {
    exclude: [...configDefaults.exclude, "test/e2e/**"],
    environment: "jsdom", // to run in browser-like environment
    env: {
      TZ: "Etc/UTC",
      IS_TEST: "true",
    },
    setupFiles: ["./test/setup.ts"],
    coverage: {
      include: [
        "src/data/**/*",
        "src/common/**/*",
        "src/external_app/**/*",
        "src/panels/**/*",
        "src/util/**/*",
      ],
      reporter: ["text", "html"],
      provider: "v8",
      reportsDirectory: "test/coverage",
    },
  },
});
