import { generateColorPalette } from "../../../../src/common/color/palette";
import type { DemoCustomTheme } from "../types";

const primaryColor = "#389638";

export const demoThemeTeachingbirds: DemoCustomTheme = {
  dark: true,
  vars: {
    ...Object.fromEntries(generateColorPalette(primaryColor, "primary")),
    "divider-color": "rgba(255, 255, 255, 0.12)",
    "primary-color": primaryColor,
    "light-primary-color": "#6f956f",
    "label-badge-red": "var(--primary-color)",
    "card-background-color": "#4e4e4e",
    "label-badge-text-color": "var(--text-primary-color)",
    "primary-background-color": "#303030",
    "sidebar-icon-color": "#d3d3d3",
    "secondary-background-color": "#2b2b2b",
    "secondary-text-color": "#389638",
    "disabled-text-color": "#545454",
    "label-badge-background-color": "var(--secondary-background-color)",
  },
};
