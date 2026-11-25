import { generateColorPalette } from "../../../../src/common/color/palette";
import type { DemoCustomTheme } from "../types";

const primaryColor = "#2980b9";

// https://community.home-assistant.io/t/slate-a-new-dark-theme/86410
export const demoThemeKernehed: DemoCustomTheme = {
  dark: true,
  vars: {
    ...Object.fromEntries(generateColorPalette(primaryColor, "primary")),
    "text-primary-color": "var(--primary-text-color)",
    "primary-color": primaryColor,
    "label-badge-red": "var(--accent-color)",
    "primary-text-color": "#FFFFFF",
    "light-primary-color": "var(--accent-color)",
    "primary-background-color": "#222222",
    "sidebar-icon-color": "#777777",
    "secondary-background-color": "#222222",
    "disabled-text-color": "#777777",
    "label-badge-background-color": "#222222",
    "table-row-background-color": "#292929",
    "secondary-text-color": "#b58e31",
    "error-color": "#b58e31",
    "success-color": "#2980b9",
    "card-background-color": "#292929",
    "label-badge-text-color": "var(--primary-text-color)",
    "dark-primary-color": "var(--accent-color)",
    "accent-color": "#2980b9",
    "table-row-alternative-background-color": "#292929",
  },
};
