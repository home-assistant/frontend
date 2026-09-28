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
      id: "extras",
      type: "symbol",
      layout: { "icon-image": "extras:shape-star" },
    },
  ],
};

describe("missingSprites", () => {
  it("reports every base icon the sheet lacks, from literals and expressions", () => {
    expect(
      missingSprites(STYLE, { "icon-cafe": {}, "icon-shop": {} }).sort()
    ).toEqual(["icon-hospital", "not-an-icon-but-a-label", "pattern-wave"]);
  });

  it("is satisfied by a complete sheet and ignores other sheets", () => {
    expect(
      missingSprites(STYLE, {
        "icon-cafe": {},
        "icon-hospital": {},
        "icon-shop": {},
        "not-an-icon-but-a-label": {},
        "pattern-wave": {},
      })
    ).toEqual([]);
  });
});
