import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  atLeastVersion,
  isDevVersion,
} from "../../../src/common/config/version";

const testTruthyData = [
  { version: "2021.1.1", major: 2021, minor: 1, patch: 1 },
  { version: "2021.1.1", major: 2021, minor: 1 },
  { version: "2021.1.1", major: 2020, minor: 12, patch: 1 },
  { version: "2021.1.1", major: 2020, minor: 12 },
  { version: "2021.2.0", major: 2021, minor: 2, patch: 0 },
  { version: "2021.2.1", major: 2021, minor: 2 },

  { version: "2021.2.4", major: 0, minor: 113, patch: 0 },
  { version: "2021.2.4", major: 0, minor: 113 },

  { version: "0.114.0", major: 0, minor: 113, patch: 0 },
  { version: "0.114.0", major: 0, minor: 113 },

  { version: "2021.2.0dev.2323", major: 2021, minor: 2, patch: 0 },
  { version: "2021.2.0dev.2323", major: 2021, minor: 2 },
];

const testFalsyData = [
  { version: "0.114.0", major: 0, minor: 115 },
  { version: "2021.2.0dev.2323", major: 2021, minor: 2, patch: 1 },
];

describe("atLeastVersion - Truthy", () => {
  testTruthyData.forEach((test) =>
    it(`'${test.version}' >= ${test.major},${test.minor},${test.patch}`, () => {
      expect(
        atLeastVersion(test.version, test.major, test.minor, test.patch)
      ).toBe(true);
    })
  );
});

describe("atLeastVersion - Falsy", () => {
  testFalsyData.forEach((test) =>
    it(`'${test.version}' >= ${test.major},${test.minor},${test.patch}`, () => {
      expect(
        atLeastVersion(test.version, test.major, test.minor, test.patch)
      ).toBe(false);
    })
  );
});

describe("atLeastVersion - DEMO", () => {
  beforeAll(() => {
    // eslint-disable-next-line no-global-assign
    __DEMO__ = true;
  });
  afterAll(() => {
    // eslint-disable-next-line no-global-assign
    __DEMO__ = false;
  });

  testFalsyData.forEach((test) =>
    it(`'${test.version}' >= ${test.major},${test.minor},${test.patch}`, () => {
      expect(atLeastVersion("2021.1.1", 2021, 1)).toBe(true);
    })
  );
});

describe("isDevVersion", () => {
  it("should return false for demo version", () => {
    // eslint-disable-next-line no-global-assign
    __DEMO__ = true;
    expect(isDevVersion("2021.1.1dev.123")).toBe(false);
    // eslint-disable-next-line no-global-assign
    __DEMO__ = false;
  });

  it("should return true for dev version", () => {
    expect(isDevVersion("2021.1.1dev.1231")).toBe(true);
  });

  it("should return false for non-dev version", () => {
    expect(isDevVersion("2021.1.1")).toBe(false);
  });
});
