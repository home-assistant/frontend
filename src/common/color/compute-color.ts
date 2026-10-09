export const THEME_COLORS = new Set([
  "primary",
  "accent",
  "red",
  "pink",
  "purple",
  "deep-purple",
  "indigo",
  "blue",
  "light-blue",
  "cyan",
  "teal",
  "green",
  "light-green",
  "lime",
  "yellow",
  "amber",
  "orange",
  "deep-orange",
  "brown",
  "light-grey",
  "grey",
  "dark-grey",
  "blue-grey",
  "black",
  "white",
]);

const YAML_ONLY_THEMES_COLORS = new Set([
  "primary-text",
  "secondary-text",
  "disabled",
]);

/**
 * Compose a CSS variable out of a theme color
 * @param color - Theme color (examples: `red`, `primary-text`)
 * @returns CSS variable in `--xxx-color` format;
 * initial color if not found in theme colors
 */
export function computeCssVariableName(color: string): string {
  if (THEME_COLORS.has(color) || YAML_ONLY_THEMES_COLORS.has(color)) {
    return `--${color}-color`;
  }
  return color;
}

/**
 * Compose a CSS variable out of a theme color & then resolve it
 * @param color - Theme color (examples: `red`, `primary-text`)
 * @returns Resolved CSS variable in `var(--xxx-color)` format;
 * initial color if not found in theme colors
 */
export function computeCssColor(color: string): string {
  const cssVarName = computeCssVariableName(color);
  if (cssVarName !== color) {
    return `var(${cssVarName})`;
  }
  return color;
}

/**
 * Get a color from document's styles
 * @param color - Named theme color (examples: `red`, `primary-text`)
 * @param style - Styles to resolve against, defaults to the document body
 * @returns Resolved color; initial color if not found in the styles
 */
export function resolveThemeColor(
  color: string,
  style?: CSSStyleDeclaration
): string {
  const cssColor = computeCssVariableName(color);
  if (cssColor.startsWith("--")) {
    const resolved = (style ?? getComputedStyle(document.body))
      .getPropertyValue(cssColor)
      .trim();
    return resolved || color;
  }
  return cssColor;
}

/**
 * Validates if a string is a valid color.
 * Accepts: hex colors (#xxx, #xxxxxx), theme colors, and valid CSS color names.
 */
export function isValidColorString(color: string | undefined): boolean {
  if (!color || typeof color !== "string") {
    return false;
  }

  // Check if it's a theme color
  if (THEME_COLORS.has(color)) {
    return true;
  }

  // Check if it's a hex color
  if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color)) {
    return true;
  }

  // Check if it's a valid CSS color name by trying to parse it
  // Use CSS.supports() for a more efficient test without DOM manipulation
  // This checks if the browser recognizes the color value
  try {
    const style = new Option().style;
    style.color = color;
    return style.color !== "";
  } catch {
    return false;
  }
}

/**
 * Converts a CSS color, like a color name, to `#rrggbb`.
 * Returns undefined for invalid colors and colors with transparency.
 */
export function cssColorToHex(color: string): string | undefined {
  const style = new Option().style;
  style.color = color;
  if (style.color === "") {
    return undefined;
  }

  // The canvas normalizes any opaque CSS color to #rrggbb. It ignores values
  // it can't paint, like "inherit", so start from transparent: that never
  // matches #rrggbb, instead of the default black.
  const context = document.createElement("canvas").getContext("2d");
  if (!context) {
    return undefined;
  }
  context.fillStyle = "transparent";
  context.fillStyle = color;
  const normalized = String(context.fillStyle);
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : undefined;
}
