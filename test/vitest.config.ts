import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      TZ: "Etc/UTC",
      IS_TEST: "true",
    },
    setupFiles: ["./test/setup.ts"],
  },
});
