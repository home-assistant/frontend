/**
 * @vitest-environment node
 */

import type { StyleSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { finalizeMapStyle } from "../../../src/common/map/map-style-transforms";

// The label rewrite keys on the exact `text-field` @versatiles/style emits; a
// bump that changed it would silently ship local-only names again.

const layer = (id: string, layout?: unknown) => ({
  id,
  type: "symbol",
  layout,
});

const style = () =>
  ({
    sources: {
      "versatiles-shortbread": {
        type: "vector",
        tiles: ["https://tiles.example.com/{z}/{x}/{y}"],
        attribution: "upstream",
        minzoom: 0,
        maxzoom: 14,
      },
    },
    layers: [
      layer("label-place-city", { "text-field": ["get", "name"] }),
      layer("label-street-primary", {
        "symbol-placement": "line",
        "text-field": ["get", "name"],
      }),
      layer("label-motorway-shield", { "text-field": "{ref}" }),
      { id: "water", type: "fill" },
    ],
  }) as unknown as StyleSpecification;

// Just enough of the expression language for the expressions built here.
const evaluate = (expression: any, properties: Record<string, string>): any => {
  if (!Array.isArray(expression)) {
    return expression;
  }
  const [op, ...args] = expression;
  switch (op) {
    case "get":
      return properties[args[0]];
    case "has":
      return args[0] in properties;
    case "!":
      return !evaluate(args[0], properties);
    case "<":
      return evaluate(args[0], properties) < evaluate(args[1], properties);
    case "concat":
      return args.map((arg) => evaluate(arg, properties)).join("");
    case "format":
      return args
        .filter((_, i) => i % 2 === 0)
        .map((arg) => evaluate(arg, properties))
        .join("");
    case "case":
      for (let i = 0; i < args.length - 1; i += 2) {
        if (evaluate(args[i], properties)) {
          return evaluate(args[i + 1], properties);
        }
      }
      return evaluate(args[args.length - 1], properties);
    default:
      throw new Error(`Unexpected operator ${op}`);
  }
};

const textField = (spec: StyleSpecification, id: string) =>
  (spec.layers.find((l) => l.id === id) as any).layout["text-field"];

describe("finalizeMapStyle", () => {
  const finalized = finalizeMapStyle("colorful", style());
  const city = textField(finalized, "label-place-city");
  const street = textField(finalized, "label-street-primary");

  // Whatever host the builder wrote has to be gone: it would be requested by
  // every browser showing the map, straight past core's proxy.
  it("repoints the source at the proxy's TileJSON", () => {
    expect(finalized.sources["versatiles-shortbread"]).toEqual({
      type: "vector",
      url: "/api/map_tiles/tilejson.json",
    });
  });

  it("refuses a style whose sources it does not recognize", () => {
    const twoSources = style();
    twoSources.sources.extra = { type: "vector", tiles: ["https://x/{z}"] };

    expect(() => finalizeMapStyle("colorful", twoSources)).toThrow(
      /expected exactly one/
    );
  });

  it("leaves Latin names alone", () => {
    expect(evaluate(city, { name: "Köln", name_en: "Cologne" })).toBe("Köln");
    expect(evaluate(city, { name: "1er arrondissement" })).toBe(
      "1er arrondissement"
    );
  });

  it("adds the English name under a non-Latin one", () => {
    expect(evaluate(city, { name: "Москва", name_en: "Moscow" })).toBe(
      "Москва\nMoscow"
    );
    expect(evaluate(city, { name: "بيروت", name_en: "Beirut" })).toBe(
      "بيروت\nBeirut"
    );
    expect(evaluate(city, { name: "東京", name_en: "Tokyo" })).toBe(
      "東京\nTokyo"
    );
  });

  it("sets the English line smaller", () => {
    expect(city.at(-1)).toEqual(
      expect.arrayContaining([["get", "name_en"], { "font-scale": 0.8 }])
    );
  });

  it("falls back to the local name without an English one", () => {
    expect(evaluate(city, { name: "בני ברק" })).toBe("בני ברק");
  });

  it("keeps street labels on one line", () => {
    expect(
      evaluate(street, { name: "شارع الحمرا", name_en: "Hamra Street" })
    ).toBe("شارع الحمرا (Hamra Street)");
  });

  it("does not touch other layers", () => {
    expect(textField(finalized, "label-motorway-shield")).toBe("{ref}");
    expect(finalized.layers[3]).toEqual(style().layers[3]);
  });

  it("softens the globe's edge and keeps the rest of the sky", () => {
    const withSky = style();
    withSky.sky = { "sky-color": "#88c", "sky-horizon-blend": 0.2 };

    expect(finalizeMapStyle("colorful", withSky).sky).toEqual({
      "sky-color": "#88c",
      "sky-horizon-blend": 0.2,
      "atmosphere-blend": 0.5,
    });
  });
});
