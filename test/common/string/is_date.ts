import { assert } from "chai";
import { isDate } from "../../../src/common/string/is_date";

describe("isDate", () => {
  assert.strictEqual(isDate("ABC"), false);

  assert.strictEqual(isDate("2021-02-03", false), true);
  assert.strictEqual(isDate("2021-02-03", true), true);

  assert.strictEqual(isDate("2021-05-25T19:23:52+00:00", true), true);
  assert.strictEqual(isDate("2021-05-25T19:23:52+00:00", false), false);
});
