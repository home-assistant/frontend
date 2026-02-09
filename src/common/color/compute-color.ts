import { DEFAULT_THEME_COLORS } from "../../resources/theme/color/color.globals";

const YAML_ONLY_THEMES_COLORS = new Set([
  "primary-text",
  "secondary-text",
  "disabled",
]);

export function computeCssColor(color: string): string {
  if (color in DEFAULT_THEME_COLORS || YAML_ONLY_THEMES_COLORS.has(color)) {
    return `var(--${color}-color)`;
  }
  return color;
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
  if (color in DEFAULT_THEME_COLORS) {
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
