import { assert } from "chai";
import { slugify } from "../../../src/common/string/slugify";

describe("slugify", () => {
  // With default delimiter
  assert.strictEqual(slugify("abc"), "abc");
  assert.strictEqual(slugify("ABC"), "abc");
  assert.strictEqual(slugify("abc DEF"), "abc_def");
  assert.strictEqual(slugify("abc.DEF"), "abc_def");
  assert.strictEqual(slugify("1`-=~!@#$%^&*()_+[];',./{}:\"<>?\\| aA"), "1_aa");
  assert.strictEqual(slugify("abc-DEF"), "abc_def");
  assert.strictEqual(slugify("abc_DEF"), "abc_def");
  assert.strictEqual(slugify("1,1"), "11");
  assert.strictEqual(slugify("abc å DEF"), "abc_a_def");
  assert.strictEqual(slugify("abc:DEF"), "abc_def");
  assert.strictEqual(slugify("abc&DEF"), "abc_def");
  assert.strictEqual(slugify("abc^^DEF"), "abc_def");
  assert.strictEqual(slugify("abc   DEF"), "abc_def");
  assert.strictEqual(slugify("_abc DEF"), "abc_def");
  assert.strictEqual(slugify("abc DEF_"), "abc_def");
  assert.strictEqual(slugify("abc-DEF ghi"), "abc_def_ghi");
  assert.strictEqual(slugify("abc-DEF-ghi"), "abc_def_ghi");
  assert.strictEqual(slugify("abc - DEF - ghi"), "abc_def_ghi");
  assert.strictEqual(slugify("abc---DEF---ghi"), "abc_def_ghi");
  assert.strictEqual(slugify("___abc___DEF___ghi___"), "abc_def_ghi");
  assert.strictEqual(slugify("___"), "unknown");
  assert.strictEqual(slugify(""), "");

  // With custom delimiter
  assert.strictEqual(slugify("abc def", "-"), "abc-def");
  assert.strictEqual(slugify("abc-def", "-"), "abc-def");
});
