import { css } from "lit";

export const darkStyles = {
  "primary-background-color": "#111111",
  "card-background-color": "#1c1c1c",
  "secondary-background-color": "#202020",
  "primary-text-color": "#e1e1e1",
  "secondary-text-color": "#9b9b9b",
  "disabled-text-color": "#6f6f6f",
  "app-header-text-color": "#e1e1e1",
  "app-header-background-color": "#101e24",
  "switch-unchecked-button-color": "#999999",
  "switch-unchecked-track-color": "#9b9b9b",
  "divider-color": "rgba(225, 225, 225, .12)",
  "mdc-ripple-color": "#AAAAAA",

  "input-idle-line-color": "rgba(255, 255, 255, 0.42)",
  "input-hover-line-color": "rgba(255, 255, 255, 0.87)",
  "input-disabled-line-color": "rgba(255, 255, 255, 0.06)",
  "input-outlined-idle-border-color": "rgba(255, 255, 255, 0.38)",
  "input-outlined-hover-border-color": "rgba(255, 255, 255, 0.87)",
  "input-outlined-disabled-border-color": "rgba(255, 255, 255, 0.06)",
  "input-fill-color": "rgba(255, 255, 255, 0.05)",
  "input-disabled-fill-color": "rgba(255, 255, 255, 0.02)",
  "input-ink-color": "rgba(255, 255, 255, 0.87)",
  "input-label-ink-color": "rgba(255, 255, 255, 0.6)",
  "input-disabled-ink-color": "rgba(255, 255, 255, 0.37)",
  "input-dropdown-icon-color": "rgba(255, 255, 255, 0.54)",

  "codemirror-keyword": "#C792EA",
  "codemirror-operator": "#89DDFF",
  "codemirror-variable": "#f07178",
  "codemirror-variable-2": "#EEFFFF",
  "codemirror-variable-3": "#DECB6B",
  "codemirror-builtin": "#FFCB6B",
  "codemirror-atom": "#F78C6C",
  "codemirror-number": "#FF5370",
  "codemirror-def": "#82AAFF",
  "codemirror-string": "#C3E88D",
  "codemirror-string-2": "#f07178",
  "codemirror-comment": "#545454",
  "codemirror-tag": "#FF5370",
  "codemirror-meta": "#FFCB6B",
  "codemirror-attribute": "#C792EA",
  "codemirror-property": "#C792EA",
  "codemirror-qualifier": "#DECB6B",
  "codemirror-type": "#DECB6B",
  "energy-grid-return-color": "#a280db",
  "map-filter":
    "invert(.9) hue-rotate(170deg) brightness(1.5) contrast(1.2) saturate(.3)",
};

export const derivedStyles = {
  "state-icon-error-color": "var(--error-state-color, var(--error-color))",
  "state-unavailable-color":
    "var(--state-icon-unavailable-color, var(--disabled-text-color))",
  "sidebar-text-color": "var(--primary-text-color)",
  "sidebar-background-color": "var(--card-background-color)",
  "sidebar-selected-text-color": "var(--primary-color)",
  "sidebar-selected-icon-color": "var(--primary-color)",
  "sidebar-icon-color": "rgba(var(--rgb-primary-text-color), 0.6)",
  "switch-checked-color": "var(--primary-color)",
  "switch-checked-button-color":
    "var(--switch-checked-color, var(--primary-background-color))",
  "switch-checked-track-color": "var(--switch-checked-color, #000000)",
  "switch-unchecked-button-color":
    "var(--switch-unchecked-color, var(--primary-background-color))",
  "switch-unchecked-track-color": "var(--switch-unchecked-color, #000000)",
  "slider-color": "var(--primary-color)",
  "slider-secondary-color": "var(--light-primary-color)",
  "slider-track-color": "var(--scrollbar-thumb-color)",
  "label-badge-background-color": "var(--card-background-color)",
  "label-badge-text-color": "rgba(var(--rgb-primary-text-color), 0.8)",
  "paper-listbox-background-color": "var(--card-background-color)",
  "paper-item-icon-color": "var(--state-icon-color)",
  "paper-item-icon-active-color": "var(--state-icon-active-color)",
  "table-row-background-color": "var(--primary-background-color)",
  "table-row-alternative-background-color": "var(--secondary-background-color)",
  "paper-slider-knob-color": "var(--slider-color)",
  "paper-slider-knob-start-color": "var(--slider-color)",
  "paper-slider-pin-color": "var(--slider-color)",
  "paper-slider-pin-start-color": "var(--slider-color)",
  "paper-slider-active-color": "var(--slider-color)",
  "paper-slider-secondary-color": "var(--slider-secondary-color)",
  "paper-slider-container-color": "var(--slider-track-color)",
  "data-table-background-color": "var(--card-background-color)",
  "markdown-code-background-color": "var(--primary-background-color)",

  // https://github.com/material-components/material-web/blob/master/docs/theming.md
  "mdc-theme-primary": "var(--primary-color)",
  "mdc-theme-secondary": "var(--accent-color)",
  "mdc-theme-background": "var(--primary-background-color)",
  "mdc-theme-surface": "var(--card-background-color)",
  "mdc-theme-on-primary": "var(--text-primary-color)",
  "mdc-theme-on-secondary": "var(--text-primary-color)",
  "mdc-theme-on-surface": "var(--primary-text-color)",
  "mdc-theme-text-disabled-on-light": "var(--disabled-text-color)",
  "mdc-theme-text-primary-on-background": "var(--primary-text-color)",
  "mdc-theme-text-secondary-on-background": "var(--secondary-text-color)",
  "mdc-theme-text-hint-on-background": "var(--secondary-text-color)",
  "mdc-theme-text-icon-on-background": "var(--secondary-text-color)",
  "mdc-theme-error": "var(--error-color)",
  "app-header-text-color": "var(--text-primary-color)",
  "app-header-background-color": "var(--primary-color)",
  "mdc-checkbox-unchecked-color": "rgba(var(--rgb-primary-text-color), 0.54)",
  "mdc-checkbox-disabled-color": "var(--disabled-text-color)",
  "mdc-radio-unchecked-color": "rgba(var(--rgb-primary-text-color), 0.54)",
  "mdc-radio-disabled-color": "var(--disabled-text-color)",
  "mdc-tab-text-label-color-default": "var(--primary-text-color)",
  "mdc-button-disabled-ink-color": "var(--disabled-text-color)",
  "mdc-button-outline-color": "var(--divider-color)",
  "mdc-dialog-scroll-divider-color": "var(--divider-color)",

  "mdc-text-field-idle-line-color": "var(--input-idle-line-color)",
  "mdc-text-field-hover-line-color": "var(--input-hover-line-color)",
  "mdc-text-field-disabled-line-color": "var(--input-disabled-line-color)",
  "mdc-text-field-outlined-idle-border-color":
    "var(--input-outlined-idle-border-color)",
  "mdc-text-field-outlined-hover-border-color":
    "var(--input-outlined-hover-border-color)",
  "mdc-text-field-outlined-disabled-border-color":
    "var(--input-outlined-disabled-border-color)",
  "mdc-text-field-fill-color": "var(--input-fill-color)",
  "mdc-text-field-disabled-fill-color": "var(--input-disabled-fill-color)",
  "mdc-text-field-ink-color": "var(--input-ink-color)",
  "mdc-text-field-label-ink-color": "var(--input-label-ink-color)",
  "mdc-text-field-disabled-ink-color": "var(--input-disabled-ink-color)",

  "mdc-select-idle-line-color": "var(--input-idle-line-color)",
  "mdc-select-hover-line-color": "var(--input-hover-line-color)",
  "mdc-select-outlined-idle-border-color":
    "var(--input-outlined-idle-border-color)",
  "mdc-select-outlined-hover-border-color":
    "var(--input-outlined-hover-border-color)",
  "mdc-select-outlined-disabled-border-color":
    "var(--input-outlined-disabled-border-color)",
  "mdc-select-fill-color": "var(--input-fill-color)",
  "mdc-select-disabled-fill-color": "var(--input-disabled-fill-color)",
  "mdc-select-ink-color": "var(--input-ink-color)",
  "mdc-select-label-ink-color": "var(--input-label-ink-color)",
  "mdc-select-disabled-ink-color": "var(--input-disabled-ink-color)",
  "mdc-select-dropdown-icon-color": "var(--input-dropdown-icon-color)",
  "mdc-select-disabled-dropdown-icon-color": "var(--input-disabled-ink-color)",

  "chip-background-color": "rgba(var(--rgb-primary-text-color), 0.15)",
  // Vaadin
  "material-body-text-color": "var(--primary-text-color)",
  "material-background-color": "var(--card-background-color)",
  "material-secondary-background-color": "var(--secondary-background-color)",
  "material-secondary-text-color": "var(--secondary-text-color)",
};

export const buttonLinkStyle = css`
  button.link {
    background: none;
    color: inherit;
    border: none;
    padding: 0;
    font: inherit;
    text-align: left;
    text-decoration: underline;
    cursor: pointer;
    outline: none;
  }
`;

export const haStyle = css`
  :host {
    font-family: var(--paper-font-body1_-_font-family);
    -webkit-font-smoothing: var(--paper-font-body1_-_-webkit-font-smoothing);
    font-size: var(--paper-font-body1_-_font-size);
    font-weight: var(--paper-font-body1_-_font-weight);
    line-height: var(--paper-font-body1_-_line-height);
  }

  app-header-layout,
  ha-app-layout {
    background-color: var(--primary-background-color);
  }

  app-header,
  app-toolbar {
    background-color: var(--app-header-background-color);
    font-weight: 400;
    color: var(--app-header-text-color, white);
  }

  app-toolbar {
    height: var(--header-height);
    border-bottom: var(--app-header-border-bottom);
    box-sizing: border-box;
  }

  app-header div[sticky] {
    height: 48px;
  }

  app-toolbar [main-title] {
    margin-left: 20px;
  }

  h1 {
    font-family: var(--paper-font-headline_-_font-family);
    -webkit-font-smoothing: var(--paper-font-headline_-_-webkit-font-smoothing);
    white-space: var(--paper-font-headline_-_white-space);
    overflow: var(--paper-font-headline_-_overflow);
    text-overflow: var(--paper-font-headline_-_text-overflow);
    font-size: var(--paper-font-headline_-_font-size);
    font-weight: var(--paper-font-headline_-_font-weight);
    line-height: var(--paper-font-headline_-_line-height);
  }

  h2 {
    font-family: var(--paper-font-title_-_font-family);
    -webkit-font-smoothing: var(--paper-font-title_-_-webkit-font-smoothing);
    white-space: var(--paper-font-title_-_white-space);
    overflow: var(--paper-font-title_-_overflow);
    text-overflow: var(--paper-font-title_-_text-overflow);
    font-size: var(--paper-font-title_-_font-size);
    font-weight: var(--paper-font-title_-_font-weight);
    line-height: var(--paper-font-title_-_line-height);
  }

  h3 {
    font-family: var(--paper-font-subhead_-_font-family);
    -webkit-font-smoothing: var(--paper-font-subhead_-_-webkit-font-smoothing);
    white-space: var(--paper-font-subhead_-_white-space);
    overflow: var(--paper-font-subhead_-_overflow);
    text-overflow: var(--paper-font-subhead_-_text-overflow);
    font-size: var(--paper-font-subhead_-_font-size);
    font-weight: var(--paper-font-subhead_-_font-weight);
    line-height: var(--paper-font-subhead_-_line-height);
  }

  a {
    color: var(--primary-color);
  }

  .secondary {
    color: var(--secondary-text-color);
  }

  .error {
    color: var(--error-color);
  }

  .warning {
    color: var(--error-color);
  }

  mwc-button.warning {
    --mdc-theme-primary: var(--error-color);
  }

  ${buttonLinkStyle}

  .card-actions a {
    text-decoration: none;
  }

  .card-actions .warning {
    --mdc-theme-primary: var(--error-color);
  }

  .layout.horizontal,
  .layout.vertical {
    display: flex;
  }
  .layout.inline {
    display: inline-flex;
  }
  .layout.horizontal {
    flex-direction: row;
  }
  .layout.vertical {
    flex-direction: column;
  }
  .layout.wrap {
    flex-wrap: wrap;
  }
  .layout.no-wrap {
    flex-wrap: nowrap;
  }
  .layout.center,
  .layout.center-center {
    align-items: center;
  }
  .layout.bottom {
    align-items: flex-end;
  }
  .layout.center-justified,
  .layout.center-center {
    justify-content: center;
  }
  .flex {
    flex: 1;
    flex-basis: 0.000000001px;
  }
  .flex-auto {
    flex: 1 1 auto;
  }
  .flex-none {
    flex: none;
  }
  .layout.justified {
    justify-content: space-between;
  }
`;

export const haStyleDialog = css`
  /* mwc-dialog (ha-dialog) styles */
  ha-dialog {
    --mdc-dialog-min-width: 400px;
    --mdc-dialog-max-width: 600px;
    --mdc-dialog-heading-ink-color: var(--primary-text-color);
    --mdc-dialog-content-ink-color: var(--primary-text-color);
    --justify-action-buttons: space-between;
  }

  ha-dialog .form {
    color: var(--primary-text-color);
  }

  a {
    color: var(--primary-color);
  }

  /* make dialog fullscreen on small screens */
  @media all and (max-width: 450px), all and (max-height: 500px) {
    ha-dialog {
      --mdc-dialog-min-width: calc(
        100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
      );
      --mdc-dialog-max-width: calc(
        100vw - env(safe-area-inset-right) - env(safe-area-inset-left)
      );
      --mdc-dialog-min-height: 100%;
      --mdc-dialog-max-height: 100%;
      --vertial-align-dialog: flex-end;
      --ha-dialog-border-radius: 0px;
    }
  }
  mwc-button.warning {
    --mdc-theme-primary: var(--error-color);
  }
  .error {
    color: var(--error-color);
  }
`;

export const haStyleScrollbar = css`
  .ha-scrollbar::-webkit-scrollbar {
    width: 0.4rem;
    height: 0.4rem;
  }

  .ha-scrollbar::-webkit-scrollbar-thumb {
    -webkit-border-radius: 4px;
    border-radius: 4px;
    background: var(--scrollbar-thumb-color);
  }

  .ha-scrollbar {
    overflow-y: auto;
    scrollbar-color: var(--scrollbar-thumb-color) transparent;
    scrollbar-width: thin;
  }
`;

export const baseEntrypointStyles = css`
  body {
    background-color: var(--primary-background-color);
    color: var(--primary-text-color);
    height: calc(100vh - 32px);
    width: 100vw;
  }
`;
