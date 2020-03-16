import { derivedStyles } from "../../resources/styles";

const hexToRgb = (hex: string): string | null => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const checkHex = hex.replace(shorthandRegex, (_m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(checkHex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
        result[3],
        16
      )}`
    : null;
};

/**
 * Apply a theme to an element by setting the CSS variables on it.
 *
 * element: Element to apply theme on.
 * themes: HASS Theme information
 * localTheme: selected theme.
 * mainElement: boolean if it is the top element of the page.
 */
export const applyThemesOnElement = (
  element,
  themes,
  localTheme,
  mainElement = false
) => {
  if (!element._themes) {
    element._themes = {};
  }
  let themeName = themes.default_theme;
  if (localTheme === "default" || (localTheme && themes.themes[localTheme])) {
    themeName = localTheme;
  }
  const styles = { ...element._themes };
  if (themeName !== "default" && (localTheme || mainElement)) {
    const theme = { ...derivedStyles, ...themes.themes[themeName] };
    Object.keys(theme).forEach((key) => {
      const prefixedKey = `--${key}`;
      element._themes[prefixedKey] = "";
      styles[prefixedKey] = theme[key];
      if (key.startsWith("rgb")) {
        return;
      }
      const rgbKey = `rgb-${key}`;
      if (theme[rgbKey] !== undefined) {
        return;
      }
      const prefixedRgbKey = `--${rgbKey}`;
      element._themes[prefixedRgbKey] = "";
      const rgbValue = hexToRgb(theme[key]);
      if (rgbValue !== null) {
        styles[prefixedRgbKey] = rgbValue;
      }
    });
  }
  if (element.updateStyles) {
    element.updateStyles(styles);
  } else if (window.ShadyCSS) {
    // implement updateStyles() method of Polymer elements
    window.ShadyCSS.styleSubtree(/** @type {!HTMLElement} */ element, styles);
  }

  if (!mainElement) {
    return;
  }

  const meta = document.querySelector("meta[name=theme-color]");
  if (meta) {
    if (!meta.hasAttribute("default-content")) {
      meta.setAttribute("default-content", meta.getAttribute("content")!);
    }
    const themeColor =
      styles["--primary-color"] || meta.getAttribute("default-content");
    meta.setAttribute("content", themeColor);
  }
};
