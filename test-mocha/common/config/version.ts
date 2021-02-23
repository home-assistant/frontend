import { assert } from "chai";
import { atLeastVersion } from "../../../src/common/config/version";

const testTruthyData = [
  { version: "2021.1.1", major: 2021, minor: 1, patch: 1 },
  { version: "2021.1.1", major: 2021, minor: 1 },
  { version: "2021.1.1", major: 2020, minor: 12, patch: 1 },
  { version: "2021.1.1", major: 2020, minor: 12 },
  { version: "2021.1.1", major: 2021, minor: 2, patch: 0 },
  { version: "2021.1.1", major: 2021, minor: 2 },

  { version: "2021.2.4", major: 0, minor: 113, patch: 0 },
  { version: "2021.2.4", major: 0, minor: 113 },

  { version: "0.114.0", major: 0, minor: 113, patch: 0 },
  { version: "0.114.0", major: 0, minor: 113 },

  { version: "2021.2.0dev.2323", major: 2021, minor: 2, patch: 0 },
  { version: "2021.2.0dev.2323", major: 2021, minor: 2 },
];

const testFalsyData = [
  { version: "0.114.0", major: 0, minor: 113 },
  { version: "2021.2.0dev.2323", major: 2021, minor: 2, patch: 0 },
];

describe("atLeastVersion - Truthy", () => {
  testTruthyData.forEach((test) =>
    it(`'${test.version}' >= ${test.major},${test.minor},${test.patch}`, () => {
      assert.isTrue(atLeastVersion("2021.1.1", 2021, 1));
    })
  );
});

describe("atLeastVersion - Falsy", () => {
  testFalsyData.forEach((test) =>
    it(`'${test.version}' >= ${test.major},${test.minor},${test.patch}`, () => {
      assert.isTrue(atLeastVersion("2021.1.1", 2021, 1));
    })
  );
});
