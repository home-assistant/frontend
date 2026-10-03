import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Benchmark configuration for chart data processing transforms.
// Runs in a plain node environment (no jsdom) and sequentially, so timings
// are as stable as possible. See test/benchmarks/README.md.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    env: {
      TZ: "Etc/UTC",
      IS_TEST: "true",
    },
    setupFiles: ["./test/benchmarks/setup.ts"],
    fileParallelism: false,
    benchmark: {
      include: ["test/benchmarks/**/*.bench.ts"],
    },
  },
});
