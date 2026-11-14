import { afterEach, describe, expect, it } from "vitest";
import {
  applyThemesOnElement,
  invalidateThemeCache,
  themeSupportsBlackMode,
} from "../../../src/common/dom/apply_themes_on_element";
import type { Theme } from "../../../src/data/ws-themes";
import type { HomeAssistant } from "../../../src/types";

// Black (OLED) is stored next to the dark mode choice. These tests protect
// that it only changes the backgrounds, and only when dark mode is active.
const themes: HomeAssistant["themes"] = {
  default_theme: "default",
  default_dark_theme: null,
  themes: {},
  darkMode: true,
  theme: "default",
};

const apply = (dark: boolean, black?: boolean) => {
  const element = document.createElement("div");
  applyThemesOnElement(element, themes, "default", { dark, black });
  return (name: string) => element.style.getPropertyValue(name);
};

describe("applyThemesOnElement black mode", () => {
  afterEach(() => {
    invalidateThemeCache();
  });

  it("makes the page, sidebar and header black but keeps the cards", () => {
    const style = apply(true, true);
    expect(style("--primary-background-color")).toBe("#000000");
    expect(style("--sidebar-background-color")).toBe("#000000");
    expect(style("--app-header-background-color")).toBe("#000000");
    expect(style("--card-background-color")).toBe("#1c1c1c");
  });

  it("leaves dark mode as it is when black is off", () => {
    expect(apply(true, false)("--primary-background-color")).toBe("#111111");
  });

  it("is ignored in light mode", () => {
    expect(apply(false, true)("--primary-background-color")).toBe("");
  });

  it("brings back the dark background when black is turned off", () => {
    const element = document.createElement("div");
    applyThemesOnElement(element, themes, "default", {
      dark: true,
      black: true,
    });
    applyThemesOnElement(element, themes, "default", {
      dark: true,
      black: false,
    });
    const style = (name: string) => element.style.getPropertyValue(name);
    expect(style("--primary-background-color")).toBe("#111111");
    expect(style("--sidebar-background-color")).toBe(
      "var(--card-background-color)"
    );
  });
});

// The theme mode picker and the themes mixin both use this rule, so Black is
// only offered when the theme used in dark mode actually applies it.
describe("themeSupportsBlackMode", () => {
  // Themes come from the backend as plain objects with optional modes.
  const theme = (modes?: Record<string, object>) => ({ modes }) as Theme;

  it("supports the default theme", () => {
    expect(themeSupportsBlackMode(undefined)).toBe(true);
  });

  it("supports a theme with a light and a dark mode", () => {
    expect(themeSupportsBlackMode(theme({ light: {}, dark: {} }))).toBe(true);
  });

  it("does not support a dark-only theme", () => {
    expect(themeSupportsBlackMode(theme({ dark: {} }))).toBe(false);
  });

  it("does not support a theme without a dark mode", () => {
    expect(themeSupportsBlackMode(theme())).toBe(false);
    expect(themeSupportsBlackMode(theme({ light: {} }))).toBe(false);
  });
});
