import { assert, describe, it } from "vitest";

import parseAspectRatio from "../../../src/common/util/parse-aspect-ratio";

describe("parseAspectRatio", () => {
  const ratio16by9 = { w: 16, h: 9 };
  const ratio178 = { w: 1.78, h: 1 };

  it("Parses 16x9", () => {
    const r = parseAspectRatio("16x9");
    assert.deepEqual(r, ratio16by9);
  });

  it("Parses 16:9", () => {
    const r = parseAspectRatio("16:9");
    assert.deepEqual(r, ratio16by9);
  });

  it("Parses 1.78x1", () => {
    const r = parseAspectRatio("1.78x1");
    assert.deepEqual(r, ratio178);
  });

  it("Parses 1.78:1", () => {
    const r = parseAspectRatio("1.78:1");
    assert.deepEqual(r, ratio178);
  });

  it("Parses 1.78", () => {
    const r = parseAspectRatio("1.78");
    assert.deepEqual(r, ratio178);
  });

  it("Parses 23%", () => {
    const r = parseAspectRatio("23%");
    assert.deepEqual(r, { w: 100, h: 23 });
  });

  it("Skips empty states", () => {
    const r = parseAspectRatio("   ");
    assert.equal(r, null);
  });

  it("Skips invalid input", () => {
    const r = parseAspectRatio("mary had a little lamb");
    assert.equal(r, null);
  });

  it("Skips invalid, but close input", () => {
    const r = parseAspectRatio("mary:lamb");
    assert.equal(r, null);
  });

  it("Skips non-string input", () => {
    // An unquoted `aspect_ratio: 16:9` in YAML is loaded as the number 969
    assert.equal(parseAspectRatio(969 as unknown as string), null);
    assert.equal(parseAspectRatio(1.78 as unknown as string), null);
  });

  it("Parses values with surrounding whitespace", () => {
    assert.deepEqual(parseAspectRatio(" 16 : 9 "), ratio16by9);
    assert.deepEqual(parseAspectRatio(" 23 % "), { w: 100, h: 23 });
  });

  it.each(["16/9", "16X9", "16x9x4", "16:9:4", "16x", "x9", "16abc", "23%x"])(
    "Skips unhandled input %s",
    (input) => {
      assert.equal(parseAspectRatio(input), null);
    }
  );
});
