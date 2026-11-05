import { describe, expect, it } from "vitest";
import "../../../../../src/panels/lovelace/editor/config-elements/hui-map-card-editor";
import type { CustomMapStyleConfig } from "../../../../../src/common/map/map-styles";
import { withMapStyleBase } from "../../../../../src/common/map/map-styles";
import type { MapCardConfig } from "../../../../../src/panels/lovelace/cards/types";

// The visual editor only picks the cartography; colors, colors_dark, recolor,
// text, icon and layers can only be written as YAML. Rebuilding `map_style`
// from the form alone used to drop those, so opening the card in the editor and
// touching anything deleted a hand-written palette without saying so.

const CUSTOM: CustomMapStyleConfig = {
  base: "colorful",
  colors: { water: "#b3ddf6", land: "#f6f6f4" },
  colors_dark: { water: "#10293b" },
  recolor: { saturate: -0.5 },
  text: { language: "nl" },
};

describe("withMapStyleBase", () => {
  it("carries the YAML-only keys through an edit", () => {
    expect(withMapStyleBase(CUSTOM, "colorful")).toEqual(CUSTOM);
  });

  it("keeps them when the cartography is switched", () => {
    expect(withMapStyleBase(CUSTOM, "toner")).toEqual({
      ...CUSTOM,
      base: "toner",
    });
  });

  it("collapses to a plain style name when nothing is customized", () => {
    expect(withMapStyleBase("gray", "gray")).toBe("gray");
    expect(withMapStyleBase(undefined, "toner")).toBe("toner");
  });

  // The form always holds a value, so the default has to read as no choice or
  // every card the editor touches gains a `map_style`.
  it("writes nothing for the default style", () => {
    expect(withMapStyleBase(undefined, "default")).toBeUndefined();
    expect(withMapStyleBase("colorful", "default")).toBeUndefined();
  });

  it("keeps a hand-written palette when the style falls back to default", () => {
    expect(withMapStyleBase(CUSTOM, "default")).toEqual({
      colors: CUSTOM.colors,
      colors_dark: CUSTOM.colors_dark,
      recolor: CUSTOM.recolor,
      text: CUSTOM.text,
    });
  });
});

describe("hui-map-card-editor", () => {
  // A hand-written palette has to survive being opened in the visual editor.
  it("opens a config with a hand-written palette", () => {
    const config: MapCardConfig = { type: "map", map_style: CUSTOM };
    const editor = document.createElement("hui-map-card-editor") as any;

    expect(() => editor.setConfig(config)).not.toThrow();
  });
});
