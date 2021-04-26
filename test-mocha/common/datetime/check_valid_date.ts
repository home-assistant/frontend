import { assert } from "chai";

import checkValidDate from "../../../src/common/datetime/check_valid_date";

describe("checkValidDate", () => {
  it("works", () => {
    assert.strictEqual(checkValidDate(new Date()), true);
    assert.strictEqual(
      checkValidDate(new Date("2021-01-19T11:36:57+00:00")),
      true
    );
    assert.strictEqual(
      checkValidDate(new Date("2021-01-19X11:36:57+00:00")),
      false
    );
    assert.strictEqual(checkValidDate(new Date("2021-01-19")), true);
    assert.strictEqual(checkValidDate(undefined), false);
  });
});
