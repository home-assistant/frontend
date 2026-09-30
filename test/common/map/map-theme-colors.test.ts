import { describe, expect, it } from "vitest";
import { readMapThemeColors } from "../../../src/common/map/map-theme-colors";

const withTokens = (tokens: Record<string, string>) => {
  const el = document.createElement("div");
  for (const [name, value] of Object.entries(tokens)) {
    el.style.setProperty(name, value);
  }
  document.body.append(el);
  return el;
};

describe("readMapThemeColors", () => {
  // The common case. Returning nothing is what keeps a map on the style the
  // build generated, instead of building one in the browser for no reason.
  it("says nothing when the theme sets no map tokens", () => {
    expect(readMapThemeColors(withTokens({}))).toBeUndefined();
  });

  // One token stands for several of the builder's keys: a theme author sets a
  // handful, not forty-five. Shorthand hex included, or the value would reach
  // the builder unnormalized and skip the opacity below.
  it("spreads one token over the colors it covers", () => {
    const colors = readMapThemeColors(
      withTokens({ "--ha-color-map-green": "#0a0" })
    );

    expect(colors).toEqual({
      naturePark: "rgba(0,170,0,1)",
      natureWood: "rgba(0,170,0,1)",
      natureGrass: "rgba(0,170,0,1)",
      natureLeisure: "rgba(0,170,0,1)",
      natureWetland: "rgba(0,170,0,1)",
      // Sports pitches are an overlay: an opaque token would make them blocks.
      siteSports: "rgba(0,170,0,0.15)",
    });
  });

  it("collects only the tokens that are set", () => {
    const colors = readMapThemeColors(
      withTokens({
        "--ha-color-map-land": "#fff",
        "--ha-color-map-water": "  #00f  ",
      })
    );

    expect(colors).toEqual({
      background: "rgba(255,255,255,1)",
      land: "rgba(255,255,255,1)",
      water: "rgba(0,0,255,1)",
    });
  });

  // The builder takes hex, rgb() and hsl() but throws on anything else, and a
  // throw costs the card its vector map. Everything leaves here as rgba().
  it("normalizes the spellings a theme may use", () => {
    const colors = readMapThemeColors(
      withTokens({
        "--ha-color-map-land": "#ff000080",
        "--ha-color-map-water": "rgb(1 2 3)",
        "--ha-color-map-label-halo": "rgba(4, 5, 6, 0.5)",
      })
    );

    expect(colors!.land).toBe("rgba(255,0,0,0.502)");
    expect(colors!.water).toBe("rgba(1,2,3,1)");
    // 0.5 from the theme, times the 80% the palettes draw a halo with.
    expect(colors!.labelHalo).toBe("rgba(4,5,6,0.4)");
  });
});
