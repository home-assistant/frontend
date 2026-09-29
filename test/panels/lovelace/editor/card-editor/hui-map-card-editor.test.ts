import { describe, expect, it } from "vitest";
import "../../../../../src/panels/lovelace/editor/config-elements/hui-map-card-editor";
import type { MapCardConfig } from "../../../../../src/panels/lovelace/cards/types";

// The form shows the cartography and its recolor sliders; colors, colors_dark,
// text, icon and layers can only be written as YAML. Rebuilding `map_style`
// from the form alone used to drop those, so opening the card in the editor and
// touching anything deleted a hand-written palette without saying so.

const editorWith = (config: MapCardConfig) => {
  const editor = document.createElement("hui-map-card-editor") as any;
  editor._config = config;
  return editor;
};

const styleConfig = (
  config: MapCardConfig,
  base: string | undefined,
  recolor?: Record<string, unknown>
) => (editorWith(config) as any)._mapStyleConfig(base, recolor);

const CUSTOM: MapCardConfig = {
  type: "map",
  map_style: {
    base: "colorful",
    colors: { water: "#b3ddf6", land: "#f6f6f4" },
    colors_dark: { water: "#10293b" },
    text: { language: "nl" },
  },
};

describe("hui-map-card-editor map style", () => {
  it("carries the YAML-only keys through an edit", () => {
    expect(styleConfig(CUSTOM, "colorful", {})).toEqual(CUSTOM.map_style);
  });

  it("keeps them when the cartography is switched", () => {
    expect(styleConfig(CUSTOM, "toner", {})).toEqual({
      ...(CUSTOM.map_style as object),
      base: "toner",
    });
  });

  it("adds recolor alongside them", () => {
    expect(styleConfig(CUSTOM, "colorful", { saturate: -0.5 })).toEqual({
      ...(CUSTOM.map_style as object),
      recolor: { saturate: -0.5 },
    });
  });

  it("collapses to a plain style name when nothing is customized", () => {
    const plain: MapCardConfig = { type: "map", map_style: "gray" };

    expect(styleConfig(plain, "gray", {})).toBe("gray");
    expect(styleConfig(plain, undefined, {})).toBeUndefined();
  });

  // The builder nests the tint; the form shows its two halves as fields, and a
  // color without an amount changes nothing.
  it("nests the tint, and ignores a tint color with no amount", () => {
    const plain: MapCardConfig = { type: "map" };

    expect(styleConfig(plain, "colorful", { tint_color: [33, 150, 243] })).toBe(
      "colorful"
    );
    expect(
      styleConfig(plain, "colorful", {
        tint_amount: 0.4,
        tint_color: [33, 150, 243],
      })
    ).toEqual({
      base: "colorful",
      recolor: { tint: { amount: 0.4, color: "#2196f3" } },
    });
  });
});
