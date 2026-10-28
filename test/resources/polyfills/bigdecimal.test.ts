import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import BigDecimal from "../../../src/resources/polyfills/bigdecimal";

// The legacy build swaps @formatjs/bigdecimal for the shim, so compare it to
// the version the polyfills are installed with
const polyfillDir = realpathSync("node_modules/@formatjs/intl-numberformat");
const { default: formatjsBigDecimal } = await import(
  createRequire(join(polyfillDir, "index.js")).resolve("@formatjs/bigdecimal")
);

const publicNames = (target: Record<string, unknown>) =>
  Object.getOwnPropertyNames(target).filter(
    (name) => !name.startsWith("_") && typeof target[name] === "function"
  );

const VALUES = [
  0,
  -0,
  1,
  -1234.5678,
  23.5,
  0.1 + 0.2,
  1000,
  999.9995,
  999.9999999999999,
  123456789.12345679,
  1e-7,
  5e-324,
  1e21,
  Number.MAX_VALUE,
];

describe("bigdecimal shim", () => {
  it("has the API of @formatjs/bigdecimal", () => {
    for (const name of publicNames(formatjsBigDecimal.prototype)) {
      expect(BigDecimal.prototype, name).toHaveProperty(name);
    }
    for (const name of publicNames(formatjsBigDecimal)) {
      expect(BigDecimal, name).toHaveProperty(name);
    }
  });

  it.each(VALUES)("matches @formatjs/bigdecimal for %s", (value) => {
    const real = new formatjsBigDecimal(value);
    const shim = new BigDecimal(value);
    expect(shim.toString()).toBe(real.toString());
    expect(shim.log(10).floor().toString()).toBe(
      real.log(10).floor().toString()
    );
    expect(shim.times(BigDecimal.pow(10, -7)).toString()).toBe(
      real.times(formatjsBigDecimal.pow(10, -7)).toString()
    );
    expect(shim.div(1000).floor().toString()).toBe(
      real.div(1000).floor().toString()
    );
  });
});
