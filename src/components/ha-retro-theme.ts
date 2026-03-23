export const RETRO_THEME = {
  // Sharp corners
  "ha-border-radius-sm": "0",
  "ha-border-radius-md": "0",
  "ha-border-radius-lg": "0",
  "ha-border-radius-xl": "0",
  "ha-border-radius-2xl": "0",
  "ha-border-radius-3xl": "0",
  "ha-border-radius-4xl": "0",
  "ha-border-radius-5xl": "0",
  "ha-border-radius-6xl": "0",
  "ha-border-radius-pill": "0",
  "ha-border-radius-circle": "0",

  // Fonts
  "ha-font-family-body":
    "Tahoma, 'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif",
  "ha-font-family-heading":
    "Tahoma, 'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif",
  "ha-font-family-code": "'Courier New', Courier, monospace",
  "ha-font-family-longform":
    "Tahoma, 'MS Sans Serif', 'Microsoft Sans Serif', Arial, sans-serif",

  // No transparency
  "ha-dialog-scrim-backdrop-filter": "none",

  // Disable animations
  "ha-animation-duration-fast": "1ms",
  "ha-animation-duration-normal": "1ms",
  "ha-animation-duration-slow": "1ms",

  modes: {
    light: {
      // Base colors
      "primary-color": "#000080",
      "dark-primary-color": "#00006B",
      "light-primary-color": "#4040C0",
      "accent-color": "#000080",
      "primary-text-color": "#000000",
      "secondary-text-color": "#404040",
      "text-primary-color": "#ffffff",
      "text-light-primary-color": "#000000",
      "disabled-text-color": "#808080",

      // Backgrounds
      "primary-background-color": "#C0C0C0",
      "lovelace-background": "#008080",
      "secondary-background-color": "#C0C0C0",
      "card-background-color": "#C0C0C0",
      "clear-background-color": "#C0C0C0",

      // RGB values
      "rgb-primary-color": "0, 0, 128",
      "rgb-accent-color": "0, 0, 128",
      "rgb-primary-text-color": "0, 0, 0",
      "rgb-secondary-text-color": "64, 64, 64",
      "rgb-text-primary-color": "255, 255, 255",
      "rgb-card-background-color": "192, 192, 192",

      // UI chrome
      "divider-color": "#808080",
      "outline-color": "#808080",
      "outline-hover-color": "#404040",
      "shadow-color": "rgba(0, 0, 0, 0.5)",
      "scrollbar-thumb-color": "#808080",
      "disabled-color": "#808080",

      // Cards - retro bevel effect
      "ha-card-border-width": "1px",
      "ha-card-border-color": "#808080",
      "ha-card-box-shadow": "1px 1px 0 #404040, -1px -1px 0 #ffffff",
      "ha-card-border-radius": "0",

      // Dialogs
      "ha-dialog-border-radius": "0",
      "ha-dialog-surface-background": "#C0C0C0",
      "dialog-box-shadow": "1px 1px 0 #404040, -1px -1px 0 #ffffff",

      // Box shadows - retro bevel
      "ha-box-shadow-s": "1px 1px 0 #404040, -1px -1px 0 #ffffff",
      "ha-box-shadow-m": "1px 1px 0 #404040, -1px -1px 0 #ffffff",
      "ha-box-shadow-l": "1px 1px 0 #404040, -1px -1px 0 #ffffff",

      // Header
      "app-header-background-color": "#000080",
      "app-header-text-color": "#ffffff",
      "app-header-border-bottom": "2px outset #C0C0C0",

      // Sidebar
      "sidebar-background-color": "#C0C0C0",
      "sidebar-text-color": "#000000",
      "sidebar-selected-text-color": "#ffffff",
      "sidebar-selected-icon-color": "#000080",
      "sidebar-icon-color": "#000000",

      // Input
      "input-fill-color": "#C0C0C0",
      "input-disabled-fill-color": "#C0C0C0",
      "input-ink-color": "#000000",
      "input-label-ink-color": "#000000",
      "input-disabled-ink-color": "#808080",
      "input-idle-line-color": "#808080",
      "input-hover-line-color": "#000000",
      "input-disabled-line-color": "#808080",
      "input-outlined-idle-border-color": "#808080",
      "input-outlined-hover-border-color": "#000000",
      "input-outlined-disabled-border-color": "#C0C0C0",
      "input-dropdown-icon-color": "#000000",

      // Status colors
      "error-color": "#FF0000",
      "warning-color": "#FF8000",
      "success-color": "#008000",
      "info-color": "#000080",

      // State
      "state-icon-color": "#000080",
      "state-active-color": "#000080",
      "state-inactive-color": "#808080",

      // Data table
      "data-table-border-width": "0",

      // Primary scale
      "ha-color-primary-05": "#00003A",
      "ha-color-primary-10": "#000050",
      "ha-color-primary-20": "#000066",
      "ha-color-primary-30": "#00007A",
      "ha-color-primary-40": "#000080",
      "ha-color-primary-50": "#0000AA",
      "ha-color-primary-60": "#4040C0",
      "ha-color-primary-70": "#6060D0",
      "ha-color-primary-80": "#8080E0",
      "ha-color-primary-90": "#C8C8D8",
      "ha-color-primary-95": "#D8D8E0",

      // Neutral scale
      "ha-color-neutral-05": "#000000",
      "ha-color-neutral-10": "#2A2A2A",
      "ha-color-neutral-20": "#404040",
      "ha-color-neutral-30": "#606060",
      "ha-color-neutral-40": "#707070",
      "ha-color-neutral-50": "#808080",
      "ha-color-neutral-60": "#909090",
      "ha-color-neutral-70": "#A0A0A0",
      "ha-color-neutral-80": "#B0B0B0",
      "ha-color-neutral-90": "#C8C8C8",
      "ha-color-neutral-95": "#D0D0D0",

      // Codemirror
      "codemirror-keyword": "#000080",
      "codemirror-operator": "#000000",
      "codemirror-variable": "#008080",
      "codemirror-variable-2": "#000080",
      "codemirror-variable-3": "#808000",
      "codemirror-builtin": "#800080",
      "codemirror-atom": "#008080",
      "codemirror-number": "#FF0000",
      "codemirror-def": "#000080",
      "codemirror-string": "#008000",
      "codemirror-string-2": "#808000",
      "codemirror-comment": "#808080",
      "codemirror-tag": "#800000",
      "codemirror-meta": "#000080",
      "codemirror-attribute": "#FF0000",
      "codemirror-property": "#000080",
      "codemirror-qualifier": "#808000",
      "codemirror-type": "#000080",
    },
    dark: {
      // Base colors
      "primary-color": "#4040C0",
      "dark-primary-color": "#000080",
      "light-primary-color": "#6060D0",
      "accent-color": "#4040C0",
      "primary-text-color": "#C0C0C0",
      "secondary-text-color": "#A0A0A0",
      "text-primary-color": "#ffffff",
      "text-light-primary-color": "#C0C0C0",
      "disabled-text-color": "#606060",

      // Backgrounds
      "primary-background-color": "#2A2A2A",
      "lovelace-background": "#003030",
      "secondary-background-color": "#2A2A2A",
      "card-background-color": "#3A3A3A",
      "clear-background-color": "#2A2A2A",

      // RGB values
      "rgb-primary-color": "64, 64, 192",
      "rgb-accent-color": "64, 64, 192",
      "rgb-primary-text-color": "192, 192, 192",
      "rgb-secondary-text-color": "160, 160, 160",
      "rgb-text-primary-color": "255, 255, 255",
      "rgb-card-background-color": "58, 58, 58",

      // UI chrome
      "divider-color": "#606060",
      "outline-color": "#606060",
      "outline-hover-color": "#808080",
      "shadow-color": "rgba(0, 0, 0, 0.7)",
      "scrollbar-thumb-color": "#606060",
      "disabled-color": "#606060",

      // Cards - retro bevel effect
      "ha-card-border-width": "1px",
      "ha-card-border-color": "#606060",
      "ha-card-box-shadow": "1px 1px 0 #1A1A1A, -1px -1px 0 #5A5A5A",
      "ha-card-border-radius": "0",

      // Dialogs
      "ha-dialog-border-radius": "0",
      "ha-dialog-surface-background": "#3A3A3A",
      "dialog-box-shadow": "1px 1px 0 #1A1A1A, -1px -1px 0 #5A5A5A",

      // Box shadows - retro bevel
      "ha-box-shadow-s": "1px 1px 0 #1A1A1A, -1px -1px 0 #5A5A5A",
      "ha-box-shadow-m": "1px 1px 0 #1A1A1A, -1px -1px 0 #5A5A5A",
      "ha-box-shadow-l": "1px 1px 0 #1A1A1A, -1px -1px 0 #5A5A5A",

      // Header
      "app-header-background-color": "#000060",
      "app-header-text-color": "#ffffff",
      "app-header-border-bottom": "2px outset #3A3A3A",

      // Sidebar
      "sidebar-background-color": "#2A2A2A",
      "sidebar-text-color": "#C0C0C0",
      "sidebar-selected-text-color": "#ffffff",
      "sidebar-selected-icon-color": "#4040C0",
      "sidebar-icon-color": "#A0A0A0",

      // Input
      "input-fill-color": "#3A3A3A",
      "input-disabled-fill-color": "#3A3A3A",
      "input-ink-color": "#C0C0C0",
      "input-label-ink-color": "#A0A0A0",
      "input-disabled-ink-color": "#606060",
      "input-idle-line-color": "#606060",
      "input-hover-line-color": "#808080",
      "input-disabled-line-color": "#404040",
      "input-outlined-idle-border-color": "#606060",
      "input-outlined-hover-border-color": "#808080",
      "input-outlined-disabled-border-color": "#404040",
      "input-dropdown-icon-color": "#A0A0A0",

      // Status colors
      "error-color": "#FF4040",
      "warning-color": "#FFA040",
      "success-color": "#40C040",
      "info-color": "#4040C0",

      // State
      "state-icon-color": "#4040C0",
      "state-active-color": "#4040C0",
      "state-inactive-color": "#606060",

      // Data table
      "data-table-border-width": "0",

      // Primary scale
      "ha-color-primary-05": "#00002A",
      "ha-color-primary-10": "#000040",
      "ha-color-primary-20": "#000060",
      "ha-color-primary-30": "#000080",
      "ha-color-primary-40": "#4040C0",
      "ha-color-primary-50": "#6060D0",
      "ha-color-primary-60": "#8080E0",
      "ha-color-primary-70": "#A0A0F0",
      "ha-color-primary-80": "#C0C0FF",
      "ha-color-primary-90": "#3A3A58",
      "ha-color-primary-95": "#303048",

      // Neutral scale
      "ha-color-neutral-05": "#1A1A1A",
      "ha-color-neutral-10": "#2A2A2A",
      "ha-color-neutral-20": "#3A3A3A",
      "ha-color-neutral-30": "#4A4A4A",
      "ha-color-neutral-40": "#606060",
      "ha-color-neutral-50": "#707070",
      "ha-color-neutral-60": "#808080",
      "ha-color-neutral-70": "#909090",
      "ha-color-neutral-80": "#A0A0A0",
      "ha-color-neutral-90": "#C0C0C0",
      "ha-color-neutral-95": "#D0D0D0",

      // Codemirror
      "codemirror-keyword": "#8080E0",
      "codemirror-operator": "#C0C0C0",
      "codemirror-variable": "#40C0C0",
      "codemirror-variable-2": "#8080E0",
      "codemirror-variable-3": "#C0C040",
      "codemirror-builtin": "#C040C0",
      "codemirror-atom": "#40C0C0",
      "codemirror-number": "#FF6060",
      "codemirror-def": "#8080E0",
      "codemirror-string": "#40C040",
      "codemirror-string-2": "#C0C040",
      "codemirror-comment": "#808080",
      "codemirror-tag": "#C04040",
      "codemirror-meta": "#8080E0",
      "codemirror-attribute": "#FF6060",
      "codemirror-property": "#8080E0",
      "codemirror-qualifier": "#C0C040",
      "codemirror-type": "#8080E0",
      "map-filter":
        "invert(0.9) hue-rotate(170deg) brightness(1.5) contrast(1.2) saturate(0.3)",
    },
  },
};
