/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import { missingSprites } from "../../build-scripts/gulp/map-sprites.js";

const STYLE = {
  layers: [
    { id: "poi", type: "symbol", layout: { "icon-image": "base:icon-cafe" } },
    {
      id: "poi-amenity",
      type: "symbol",
      layout: {
        "icon-image": [
          "match",
          ["get", "amenity"],
          "clinic",
          "base:icon-hospital",
          "base:icon-shop",
        ],
        "text-field": "base:not-an-icon-but-a-label",
      },
    },
    {
      id: "water",
      type: "fill",
      paint: { "fill-pattern": "base:pattern-wave" },
    },
    {
      id: "rail",
      type: "line",
      paint: {
        "line-pattern": [
          "case",
          ["get", "tunnel"],
          "base:pattern-rail",
          "base:icon-shop",
        ],
      },
    },
    {
      id: "extras",
      type: "symbol",
      layout: { "icon-image": "extras:shape-star" },
    },
  ],
};

describe("missingSprites", () => {
  it("reports every base image the sheet lacks, from literals and expressions", () => {
    expect(
      missingSprites(STYLE, { "icon-cafe": {}, "icon-shop": {} }).sort()
    ).toEqual(["icon-hospital", "pattern-rail", "pattern-wave"]);
  });

  it("ignores base-prefixed text and other sprite sheets", () => {
    expect(
      missingSprites(STYLE, {
        "icon-cafe": {},
        "icon-hospital": {},
        "icon-shop": {},
        "pattern-rail": {},
        "pattern-wave": {},
      })
    ).toEqual([]);
  });
});
