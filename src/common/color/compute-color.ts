import { DEFAULT_THEME_COLORS } from "../../resources/theme/color/color.globals";

const YAML_ONLY_THEMES_COLORS = new Set([
  "primary-text",
  "secondary-text",
  "disabled",
]);

export function computeCssColor(color: string): string {
  // prettier-ignore
  if (
    color in DEFAULT_THEME_COLORS ||
    YAML_ONLY_THEMES_COLORS.has(color)
  ) {
    return `var(--${color}-color)`;
  }
  return color;
}
