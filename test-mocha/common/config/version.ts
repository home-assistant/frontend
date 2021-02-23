import { assert } from "chai";
import { atLeastVersion } from "../../../src/common/config/version";

describe("atLeastVersion", () => {
  it("'2021.1.1', 2021, 1", () => {
    assert.isTrue(atLeastVersion("2021.1.1", 2021, 1));
  });
  it("'2021.1.1', 2021, 2", () => {
    assert.isTrue(atLeastVersion("2021.1.1", 2020, 12));
  });
  it("'2021.1.1', 2021, 1, 0", () => {
    assert.isTrue(atLeastVersion("2021.1.1", 2021, 1, 0));
  });
  it("'2021.1.1', 2021, 1, 1", () => {
    assert.isTrue(atLeastVersion("2021.1.1", 2021, 1, 1));
  });
  it("'2021.2.4', 0, 113", () => {
    assert.isTrue(atLeastVersion("2021.2.4", 0, 113));
  });

  it("'2021.2.3', 2021, 2, 4", () => {
    assert.isFalse(atLeastVersion("2021.2.3", 2021, 2, 4));
  });
  it("'0.114.0', 0, 113", () => {
    assert.isTrue(atLeastVersion("0.114.0", 0, 113));
  });
  it("'2021.2.0dev.2323', 2021, 2, 4", () => {
    assert.isFalse(atLeastVersion("2021.2.0dev.2323", 2021, 2, 1));
  });
});
