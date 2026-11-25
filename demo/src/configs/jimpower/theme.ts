import { generateColorPalette } from "../../../../src/common/color/palette";
import type { DemoCustomTheme } from "../types";

const primaryColor = "#5294E2";

export const demoThemeJimpower: DemoCustomTheme = {
  dark: true,
  vars: {
    ...Object.fromEntries(generateColorPalette(primaryColor, "primary")),
    "text-primary-color": "var(--primary-text-color)",
    "primary-color": primaryColor,
    "label-badge-red": "var(--accent-color)",
    "light-primary-color": "var(--accent-color)",
    "primary-background-color": "#383C45",
    "primary-text-color": "#FFFFFF",
    "secondary-background-color": "#383C45",
    "disabled-text-color": "#7F848E",
    "label-badge-background-color": "#2E333A",
    "sidebar-icon-color": "var(--state-icon-color)",
    "table-row-background-color": "#353840",
    "secondary-text-color": "#5294E2",
    "error-color": "#E45E65",
    "success-color": "#39E949",
    "card-background-color": "#434954",
    "label-badge-text-color": "var(--primary-text-color)",
    "dark-primary-color": "var(--accent-color)",
    "accent-color": "#E45E65",
    "table-row-alternative-background-color": "#3E424B",
    "ha-card-border-radius": "20px",
    "ha-card-box-shadow": "3px 3px rgba(0, 0, 0, 0.4)",
    "ha-card-border-color": "rgba(100, 100, 100, 0.3)",
  },
};
