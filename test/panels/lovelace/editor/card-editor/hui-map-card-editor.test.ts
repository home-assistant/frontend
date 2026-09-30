import { describe, expect, it } from "vitest";
import "../../../../../src/panels/lovelace/editor/config-elements/hui-map-card-editor";
import type { MapCardConfig } from "../../../../../src/panels/lovelace/cards/types";

// The form only picks the cartography; colors, colors_dark, recolor, text, icon
// and layers can only be written as YAML. Rebuilding `map_style` from the form
// alone used to drop those, so opening the card in the editor and touching
// anything deleted a hand-written palette without saying so.

const editorWith = (config: MapCardConfig) => {
  const editor = document.createElement("hui-map-card-editor") as any;
  editor._config = config;
  return editor;
};

const styleConfig = (config: MapCardConfig, base: string | undefined) =>
  editorWith(config)._mapStyleConfig(base);

const CUSTOM: MapCardConfig = {
  type: "map",
  map_style: {
    base: "colorful",
    colors: { water: "#b3ddf6", land: "#f6f6f4" },
    colors_dark: { water: "#10293b" },
    recolor: { saturate: -0.5 },
    text: { language: "nl" },
  },
};

describe("hui-map-card-editor map style", () => {
  it("carries the YAML-only keys through an edit", () => {
    expect(styleConfig(CUSTOM, "colorful")).toEqual(CUSTOM.map_style);
  });

  it("keeps them when the cartography is switched", () => {
    expect(styleConfig(CUSTOM, "toner")).toEqual({
      ...(CUSTOM.map_style as object),
      base: "toner",
    });
  });

  it("collapses to a plain style name when nothing is customized", () => {
    const plain: MapCardConfig = { type: "map", map_style: "gray" };

    expect(styleConfig(plain, "gray")).toBe("gray");
    expect(styleConfig(plain, undefined)).toBeUndefined();
  });

  // A hand-written palette has to survive being opened in the visual editor.
  it("opens a config with a hand-written palette", () => {
    const editor = document.createElement("hui-map-card-editor") as any;

    expect(() => editor.setConfig(CUSTOM)).not.toThrow();
  });
});
