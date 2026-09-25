/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import { addLatinLabels } from "../../build-scripts/gulp/map-labels.js";

// The rewrite keys on the exact `text-field` @versatiles/style emits; a bump
// that changed it would silently ship local-only names again.

const layer = (id, layout) => ({ id, type: "symbol", layout });

const STYLE = {
  layers: [
    layer("label-place-city", { "text-field": ["get", "name"] }),
    layer("label-street-primary", {
      "symbol-placement": "line",
      "text-field": ["get", "name"],
    }),
    layer("label-motorway-shield", { "text-field": "{ref}" }),
    { id: "water", type: "fill" },
  ],
};

// Just enough of the expression language for the expressions built here.
const evaluate = (expression, properties) => {
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

const textField = (style, id) =>
  style.layers.find((l) => l.id === id).layout["text-field"];

describe("addLatinLabels", () => {
  const style = addLatinLabels(STYLE);
  const city = textField(style, "label-place-city");
  const street = textField(style, "label-street-primary");

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
    expect(textField(style, "label-motorway-shield")).toBe("{ref}");
    expect(style.layers[3]).toEqual(STYLE.layers[3]);
  });
});
