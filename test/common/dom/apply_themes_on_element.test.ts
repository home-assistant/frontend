import { beforeEach, describe, expect, it } from "vitest";
import {
  applyThemesOnElement,
  invalidateThemeCache,
} from "../../../src/common/dom/apply_themes_on_element";
import { normalizeLuminance } from "../../../src/common/color/palette";
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

  it("only tints the dark mode header for the default theme", () => {
    const themes = makeThemes({
      oled: asTheme({ modes: { light: {}, dark: {} } }),
    });

    expect(
      apply(themes, "default", true).getPropertyValue(
        "--app-header-background-color"
      )
    ).toMatch(/^#/);
    expect(
      apply(themes, "oled", true).getPropertyValue(
        "--app-header-background-color"
      )
    ).toBe("var(--sidebar-background-color)");
  });
});

describe("applyThemesOnElement theme palette", () => {
  beforeEach(() => {
    invalidateThemeCache();
  });

  const applyTheme = (theme: Theme): CSSStyleDeclaration => {
    const element = document.createElement("div");
    applyThemesOnElement(element, makeThemes({ custom: theme }), "custom");
    return element.style;
  };

  it("generates the palette from the theme primary color", () => {
    const style = applyTheme(asTheme({ "primary-color": "#ff00ff" }));

    expect(style.getPropertyValue("--ha-color-primary-50")).toBe(
      normalizeLuminance("#ff00ff")
    );
    expect(style.getPropertyValue("--ha-color-primary-05")).not.toBe("");
    expect(style.getPropertyValue("--ha-color-primary-90")).not.toBe("");
    expect(style.getPropertyValue("--dark-primary-color")).not.toBe("");
  });

  it("parses named colors", () => {
    const style = applyTheme(asTheme({ "primary-color": "pink" }));

    expect(style.getPropertyValue("--primary-color")).toBe("pink");
    expect(style.getPropertyValue("--ha-color-primary-50")).toBe(
      normalizeLuminance("#ffc0cb")
    );
  });

  it("doesn't recolor state icons or text on primary", () => {
    const style = applyTheme(asTheme({ "primary-color": "#ff00ff" }));

    expect(style.getPropertyValue("--state-icon-color")).toBe("");
    expect(style.getPropertyValue("--text-primary-color")).toBe("");
  });

  it("keeps palette keys and shades the theme sets itself", () => {
    const style = applyTheme(
      asTheme({
        "primary-color": "#ff00ff",
        "dark-primary-color": "#330033",
      })
    );

    expect(style.getPropertyValue("--dark-primary-color")).toBe("#330033");
    expect(style.getPropertyValue("--ha-color-primary-50")).not.toBe("");
  });

  it("keeps the palette readable for a near black theme color", () => {
    const style = applyTheme(asTheme({ "primary-color": "#111111" }));

    expect(style.getPropertyValue("--primary-color")).toBe("#111111");
    expect(style.getPropertyValue("--ha-color-primary-50")).toBe(
      normalizeLuminance("#111111")
    );
    expect(style.getPropertyValue("--ha-color-primary-50")).not.toBe("#111111");
  });

  it("doesn't generate anything when the theme sets part of the palette", () => {
    const style = applyTheme(
      asTheme({ "primary-color": "#ff00ff", "ha-color-primary-40": "#123456" })
    );

    expect(style.getPropertyValue("--ha-color-primary-40")).toBe("#123456");
    expect(style.getPropertyValue("--ha-color-primary-50")).toBe("");
  });

  it("skips colors it can't parse", () => {
    const style = applyTheme(asTheme({ "primary-color": "var(--my-color)" }));

    expect(style.getPropertyValue("--primary-color")).toBe("var(--my-color)");
    expect(style.getPropertyValue("--ha-color-primary-50")).toBe("");
  });
});
