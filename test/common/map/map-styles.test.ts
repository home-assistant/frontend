import { describe, expect, it } from "vitest";
import {
  HA_MAP_COLORS,
  HA_MAP_COLORS_DARK,
} from "../../../src/common/map/ha-map-palette";
import { resolveMapStyle } from "../../../src/common/map/map-styles";

const colorsOf = (
  style: Parameters<typeof resolveMapStyle>[0],
  dark: boolean
) =>
  resolveMapStyle(style, dark).options?.colors as
    Record<string, string> | undefined;

describe("resolveMapStyle", () => {
  // The map every dashboard shows without configuration: the Home Assistant
  // palette, which the build wrote out, so nothing is built in the browser.
  it("defaults to the Home Assistant style, and fetches what the build shipped", () => {
    expect(resolveMapStyle(undefined, false)).toEqual({
      palette: "colorful",
      options: { colors: HA_MAP_COLORS },
      baseColors: HA_MAP_COLORS,
      shipped: "light",
    });
    expect(resolveMapStyle(undefined, true)).toEqual({
      palette: "colorful-dark",
      options: { colors: HA_MAP_COLORS_DARK },
      baseColors: HA_MAP_COLORS_DARK,
      shipped: "dark",
    });
    expect(resolveMapStyle("default", true)).toEqual(
      resolveMapStyle(undefined, true)
    );
  });

  // Every style ships a light and a dark palette, so the theme mode picks the
  // half whatever style a card names.
  it("picks the palette from the theme mode", () => {
    expect(resolveMapStyle("toner", false)).toEqual({ palette: "toner" });
    expect(resolveMapStyle("toner", true)).toEqual({ palette: "toner-dark" });
  });

  // Naming a VersaTiles palette asks for that cartography as it comes; the
  // Home Assistant colors are the default style's, not colorful's.
  it("leaves the VersaTiles palettes unpainted", () => {
    expect(resolveMapStyle("colorful", false)).toEqual({ palette: "colorful" });
    expect(resolveMapStyle("gray", true)).toEqual({ palette: "gray-dark" });
  });

  // A style that does not exist has no palette to build, which would leave the
  // map blank rather than merely wrong.
  it("falls back to the default for a style that does not exist", () => {
    expect(resolveMapStyle("eclipse" as never, false).palette).toBe("colorful");
    expect(colorsOf("eclipse" as never, false)).toEqual(HA_MAP_COLORS);
  });

  describe("on top of a style", () => {
    // Naming one color should not cost the rest of the look.
    it("puts the style's own colors underneath a card's", () => {
      const colors = colorsOf({ colors: { water: "#ff0000" } }, false)!;

      expect(colors.water).toBe("#ff0000");
      expect(colors.land).toBe(HA_MAP_COLORS.land);
    });

    it("keeps the style's colors under a recolor, and builds it", () => {
      const resolved = resolveMapStyle({ recolor: { saturate: -1 } }, true);

      expect(resolved.options).toEqual({
        recolor: { saturate: -1 },
        colors: HA_MAP_COLORS_DARK,
      });
      // Anything added to the default is no longer what the build wrote out.
      expect(resolved.shipped).toBeUndefined();
    });

    it("adds nothing to a palette that has no colors of its own", () => {
      expect(
        colorsOf({ base: "toner", colors: { water: "#ff0000" } }, true)
      ).toEqual({ water: "#ff0000" });
    });
  });

  describe("colors_dark", () => {
    const style = {
      base: "toner" as const,
      colors: { water: "#b3ddf6", land: "#f6f6f4" },
      colors_dark: { water: "#10293b" },
    };

    it("uses colors on the light palette and colors_dark on the dark one", () => {
      expect(colorsOf(style, false)).toEqual({
        water: "#b3ddf6",
        land: "#f6f6f4",
      });
      expect(colorsOf(style, true)).toEqual({ water: "#10293b" });
    });

    // Merging is what the option exists to avoid: a light `land` showing
    // through on the dark palette is exactly the mistake it prevents.
    it("replaces colors rather than merging into it", () => {
      expect(colorsOf(style, true)).not.toHaveProperty("land");
    });

    // Ours, not the builder's, so it is spelled the way configs are. The
    // camelCase tolerance below is for options pasted from the styler.
    it("takes only the snake_case spelling", () => {
      const camel = {
        base: "toner",
        colorsDark: { water: "#10293b" },
      } as never;

      // Ignored outright, so the style keeps its own dark colors.
      expect(colorsOf(camel, true)).toBeUndefined();
    });
  });

  // Handed to the builder's caller so a rejected adjustment falls back to the
  // style as it ships, not to the builder's unpainted cartography.
  it("carries the style's own colors alongside the adjustments", () => {
    const style = resolveMapStyle({ colors: { water: "#b3ddf6" } }, false);

    expect(style.baseColors).toEqual(HA_MAP_COLORS);
    expect(style.options!.colors).toMatchObject({ water: "#b3ddf6" });
  });

  // The builder names its options in camelCase, Home Assistant configs are
  // snake_case, and an options object copied out of the versatiles styler is
  // already camelCase. Both have to arrive as the builder spells them, at every
  // level: v6 nests them several deep.
  it("accepts snake_case and camelCase option names, nested", () => {
    const snake = resolveMapStyle(
      {
        base: "muted",
        recolor: { invert_brightness: true, rotate_hue: 90 },
        text: { language_strict: true, places: { cities: { size: 1.2 } } },
      },
      false
    );
    const camel = resolveMapStyle(
      {
        base: "muted",
        recolor: { invertBrightness: true, rotateHue: 90 },
        text: { languageStrict: true, places: { cities: { size: 1.2 } } },
      } as never,
      false
    );

    expect(snake.options).toEqual({
      recolor: { invertBrightness: true, rotateHue: 90 },
      text: { languageStrict: true, places: { cities: { size: 1.2 } } },
    });
    expect(camel.options).toEqual(snake.options);
  });

  // The builder also takes the tile, glyph and sprite URLs, the projection and
  // the elevation features. Those stay ours: a card that could set them would
  // send every viewer's address to whatever host it named.
  it("drops options a card does not get to set", () => {
    const resolved = resolveMapStyle(
      {
        base: "gray",
        urls: { base: "https://example.com" },
        projection: "mercator",
        features: { terrain: true },
        theme: "toner-dark",
        recolor: { saturate: -1 },
      } as never,
      false
    );

    expect(resolved.options).toEqual({ recolor: { saturate: -1 } });
    expect(resolved.palette).toBe("gray");
  });
});

describe("theme colors", () => {
  const theme = { water: "#ff0000", land: "#00ff00" };

  // A theme repaints over the style; a card's own colors still win.
  it("layers between the style and the card", () => {
    const resolved = resolveMapStyle(
      { colors: { water: "#0000ff" } },
      false,
      theme
    );
    const colors = resolved.options?.colors as Record<string, string>;

    expect(colors.water).toBe("#0000ff");
    expect(colors.land).toBe("#00ff00");
    // Untouched by either: still the Home Assistant palette's own value.
    expect(colors.building).toBe(HA_MAP_COLORS.building);
  });

  // The generated file has no theme painted into it, so a themed map has to be
  // built in the browser instead of fetched.
  it("stops the style from being the one the build shipped", () => {
    expect(resolveMapStyle(undefined, false).shipped).toBe("light");
    expect(resolveMapStyle(undefined, false, theme).shipped).toBeUndefined();
  });

  it("changes nothing when the theme says nothing", () => {
    expect(resolveMapStyle(undefined, true, undefined)).toEqual(
      resolveMapStyle(undefined, true)
    );
  });
});
