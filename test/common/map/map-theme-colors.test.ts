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
  // handful, not forty-five.
  it("spreads one token over the colors it covers", () => {
    const colors = readMapThemeColors(
      withTokens({ "--ha-color-map-green": "#0a0" })
    );

    expect(colors).toEqual({
      naturePark: "#0a0",
      natureWood: "#0a0",
      natureGrass: "#0a0",
      natureLeisure: "#0a0",
      natureWetland: "#0a0",
      siteSports: "#0a0",
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
      background: "#fff",
      land: "#fff",
      water: "#00f",
    });
  });
});
