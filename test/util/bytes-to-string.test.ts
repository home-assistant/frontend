import { describe, expect, it } from "vitest";
import { bytesToString } from "../../src/util/bytes-to-string";

describe("bytesToString", () => {
  it("formats zero and missing values", () => {
    expect(bytesToString(0)).toBe("0 Bytes");
    expect(bytesToString()).toBe("0 Bytes");
  });

  it("formats values in the matching unit", () => {
    expect(bytesToString(500)).toBe("500 Bytes");
    expect(bytesToString(1024)).toBe("1 KB");
    expect(bytesToString(1536)).toBe("1.5 KB");
    expect(bytesToString(1024 ** 2)).toBe("1 MB");
    expect(bytesToString(5 * 1024 ** 3)).toBe("5 GB");
  });

  it("respects the number of decimals", () => {
    expect(bytesToString(1234567, 0)).toBe("1 MB");
    expect(bytesToString(1234567, 3)).toBe("1.177 MB");
    expect(bytesToString(1234567, -1)).toBe("1 MB");
  });

  it.each([
    [1024 ** 5 - 1, 2, "1 PB"],
    [1024 ** 2 - 1, 2, "1 MB"],
    [1024 ** 3 - 1, 2, "1 GB"],
    [1024 ** 4 - 1, 2, "1 TB"],
    [1024 ** 2 - 100, 0, "1 MB"],
  ])(
    "uses the next unit when %d bytes rounds up to it with %d decimals",
    (value, decimals, expected) => {
      expect(bytesToString(value, decimals)).toBe(expected);
    }
  );

  it("formats exact unit boundaries in the larger unit", () => {
    for (let i = 1; i < 9; i++) {
      expect(bytesToString(1024 ** i)).toMatch(/^1 [KMGTPEZY]B$/);
    }
  });
});
