import { css } from "lit-element";

export const derivedStyles = {
  "error-state-color": "var(--error-color)",
  "state-icon-unavailable-color": "var(--disabled-text-color)",
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
  "slider-bar-color": "var(--disabled-text-color)",
  "label-badge-grey": "var(--paper-grey-500)",
  "label-badge-background-color": "var(--card-background-color)",
  "label-badge-text-color": "rgba(var(--rgb-primary-text-color), 0.8)",
  "paper-card-background-color": "var(--card-background-color)",
  "paper-listbox-background-color": "var(--card-background-color)",
  "paper-item-icon-color": "var(--state-icon-color)",
  "paper-item-icon-active-color": "var(--state-icon-active-color)",
  "table-row-background-color": "var(--primary-background-color)",
  "table-row-alternative-background-color": "var(--secondary-background-color)",
  "paper-slider-knob-color": "var(--slider-color)",
  "paper-slider-knob-start-color": "var(--slider-color)",
  "paper-slider-pin-color": "var(--slider-color)",
  "paper-slider-active-color": "var(--slider-color)",
  "paper-slider-secondary-color": "var(--slider-secondary-color)",
  "paper-slider-container-color": "var(--slider-bar-color)",
  "data-table-background-color": "var(--card-background-color)",
  "mdc-theme-primary": "var(--primary-color)",
  "mdc-theme-secondary": "var(--accent-color)",
  "mdc-theme-background": "var(--primary-background-color)",
  "mdc-theme-surface": "var(--card-background-color)",
  "mdc-theme-on-primary": "var(--text-primary-color)",
  "mdc-theme-on-secondary": "var(--text-primary-color)",
  "mdc-theme-on-surface": "var(--primary-text-color)",
  "mdc-theme-text-primary-on-background": "var(--primary-text-color)",
  "app-header-text-color": "var(--text-primary-color)",
  "app-header-background-color": "var(--primary-color)",
  "material-body-text-color": "var(--primary-text-color)",
  "material-background-color": "var(--card-background-color)",
  "material-secondary-background-color": "var(--secondary-background-color)",
  "mdc-checkbox-unchecked-color": "rgba(var(--rgb-primary-text-color), 0.54)",
  "mdc-checkbox-disabled-color": "var(--disabled-text-color)",
};

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

  app-toolbar ha-menu-button + [main-title],
  app-toolbar ha-icon-button-arrow-prev + [main-title],
  app-toolbar ha-icon-button + [main-title] {
    margin-left: 24px;
  }

  h1 {
    font-family: var(--paper-font-title_-_font-family);
    -webkit-font-smoothing: var(--paper-font-title_-_-webkit-font-smoothing);
    white-space: var(--paper-font-title_-_white-space);
    overflow: var(--paper-font-title_-_overflow);
    text-overflow: var(--paper-font-title_-_text-overflow);
    font-size: var(--paper-font-title_-_font-size);
    font-weight: var(--paper-font-title_-_font-weight);
    line-height: var(--paper-font-title_-_line-height);
  }

  h2 {
    font-family: var(--paper-font-subhead_-_font-family);
    -webkit-font-smoothing: var(--paper-font-subhead_-_-webkit-font-smoothing);
    white-space: var(--paper-font-subhead_-_white-space);
    overflow: var(--paper-font-subhead_-_overflow);
    text-overflow: var(--paper-font-subhead_-_text-overflow);
    font-size: var(--paper-font-subhead_-_font-size);
    font-weight: var(--paper-font-subhead_-_font-weight);
    line-height: var(--paper-font-subhead_-_line-height);
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

  button.link {
    background: none;
    color: inherit;
    border: none;
    padding: 0;
    font: inherit;
    text-align: left;
    text-decoration: underline;
    cursor: pointer;
  }

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
  /* prevent clipping of positioned elements */
  paper-dialog-scrollable {
    --paper-dialog-scrollable: {
      -webkit-overflow-scrolling: auto;
    }
  }

  /* force smooth scrolling for iOS 10 */
  paper-dialog-scrollable.can-scroll {
    --paper-dialog-scrollable: {
      -webkit-overflow-scrolling: touch;
    }
  }

  .paper-dialog-buttons {
    align-items: flex-end;
    padding: 8px;
  }

  @media all and (min-width: 450px) {
    ha-paper-dialog {
      min-width: 400px;
    }
  }

  @media all and (max-width: 450px), all and (max-height: 500px) {
    paper-dialog,
    ha-paper-dialog {
      margin: 0;
      width: 100% !important;
      max-height: calc(100% - 64px);

      position: fixed !important;
      bottom: 0px;
      left: 0px;
      right: 0px;
      overflow: scroll;
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
    }
  }

  /* mwc-dialog (ha-dialog) styles */
  ha-dialog {
    --mdc-dialog-min-width: 400px;
    --mdc-dialog-max-width: 600px;
    --mdc-dialog-heading-ink-color: var(--primary-text-color);
    --mdc-dialog-content-ink-color: var(--primary-text-color);
    --justify-action-buttons: space-between;
  }

  ha-dialog .form {
    padding-bottom: 24px;
    color: var(--primary-text-color);
  }

  /* make dialog fullscreen on small screens */
  @media all and (max-width: 450px), all and (max-height: 500px) {
    ha-dialog {
      --mdc-dialog-min-width: 100vw;
      --mdc-dialog-max-height: 100vh;
      --mdc-shape-medium: 0px;
      --vertial-align-dialog: flex-end;
    }
  }
  mwc-button.warning {
    --mdc-theme-primary: var(--error-color);
  }
  .error {
    color: var(--error-color);
  }
`;
