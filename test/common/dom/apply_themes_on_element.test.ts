import { beforeEach, describe, expect, it } from "vitest";
import {
  applyThemesOnElement,
  invalidateThemeCache,
} from "../../../src/common/dom/apply_themes_on_element";
import type { Theme, Themes } from "../../../src/data/ws-themes";

const PICKED_PRIMARY = "#e91e63";
const PICKED_ACCENT = "#4caf50";

// Themes from YAML are partial, the `Theme` type lists keys most themes set.
const asTheme = (variables: object) => variables as Theme;

const makeThemes = (themes: Record<string, Theme>): Themes => ({
  default_theme: "default",
  default_dark_theme: null,
  themes,
  darkMode: false,
  theme: "default",
});

const apply = (
  themes: Themes,
  theme: string,
  dark = false
): CSSStyleDeclaration => {
  const element = document.createElement("div");
  applyThemesOnElement(
    element,
    themes,
    theme,
    { primaryColor: PICKED_PRIMARY, accentColor: PICKED_ACCENT, dark },
    true
  );
  return element.style;
};

// Colors picked in the profile used to apply to the default theme only. A
// custom theme that leaves a color unset now gets the picked one, while a
// color the theme sets itself always wins.
describe("applyThemesOnElement user colors", () => {
  beforeEach(() => {
    invalidateThemeCache();
  });

  it("applies picked colors and the primary palette to a theme that doesn't set them", () => {
    const style = apply(
      makeThemes({ oled: asTheme({ "primary-background-color": "#000000" }) }),
      "oled"
    );

    expect(style.getPropertyValue("--primary-color")).toBe(PICKED_PRIMARY);
    expect(style.getPropertyValue("--accent-color")).toBe(PICKED_ACCENT);
    expect(style.getPropertyValue("--ha-color-primary-50")).not.toBe("");
    expect(style.getPropertyValue("--primary-background-color")).toBe(
      "#000000"
    );
  });

  it("keeps a primary color set by the theme and still applies the picked accent", () => {
    const style = apply(
      makeThemes({ pink: asTheme({ "primary-color": "#ff00ff" }) }),
      "pink"
    );

    expect(style.getPropertyValue("--primary-color")).toBe("#ff00ff");
    expect(style.getPropertyValue("--ha-color-primary-50")).toBe("");
    expect(style.getPropertyValue("--accent-color")).toBe(PICKED_ACCENT);
  });

  it("treats a theme that sets primary palette keys as setting the primary color", () => {
    const style = apply(
      makeThemes({ palette: asTheme({ "ha-color-primary-40": "#123456" }) }),
      "palette"
    );

    expect(style.getPropertyValue("--primary-color")).not.toBe(PICKED_PRIMARY);
    expect(style.getPropertyValue("--ha-color-primary-40")).toBe("#123456");
  });

  it("reads theme colors from the active mode", () => {
    const themes = makeThemes({
      modes: asTheme({
        modes: { light: {}, dark: { "primary-color": "#ff00ff" } },
      }),
    });

    expect(apply(themes, "modes").getPropertyValue("--primary-color")).toBe(
      PICKED_PRIMARY
    );
    expect(
      apply(themes, "modes", true).getPropertyValue("--primary-color")
    ).toBe("#ff00ff");
  });

  it("lets the theme header color win over the tint derived in dark mode", () => {
    const style = apply(
      makeThemes({
        oled: asTheme({
          modes: { dark: { "app-header-background-color": "#000000" } },
        }),
      }),
      "oled",
      true
    );

    expect(style.getPropertyValue("--primary-color")).toBe(PICKED_PRIMARY);
    expect(style.getPropertyValue("--app-header-background-color")).toBe(
      "#000000"
    );
  });
});
