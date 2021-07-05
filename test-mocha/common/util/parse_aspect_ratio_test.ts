import { assert } from "chai";

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
});
