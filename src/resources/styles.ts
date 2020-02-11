import { css } from "lit-element";

export const derivedStyles = {
  "paper-spinner-color": "var(--primary-color)",
  "error-state-color": "var(--error-color)",
  "state-icon-unavailable-color": "var(--disabled-text-color)",
  "sidebar-text-color": "var(--primary-text-color)",
  "sidebar-background-color": "var(--paper-listbox-background-color);",
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
  "app-header-text-color": "var(--text-primary-color)",
  "app-header-background-color": "var(--primary-color)",
  "material-body-text-color": "var(--primary-text-color)",
  "material-background-color": "var(--card-background-color)",
  "material-secondary-background-color": "var(--secondary-background-color)",
};

export const haStyle = css`
  :host {
    @apply --paper-font-body1;
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
  app-toolbar ha-paper-icon-button-arrow-prev + [main-title],
  app-toolbar paper-icon-button + [main-title] {
    margin-left: 24px;
  }

  h1 {
    @apply --paper-font-title;
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
    --mdc-theme-primary: var(--google-red-500);
  }

  .layout.horizontal,
  .layout.vertical {
    display: -ms-flexbox;
    display: -webkit-flex;
    display: flex;
  }
  .layout.inline {
    display: -ms-inline-flexbox;
    display: -webkit-inline-flex;
    display: inline-flex;
  }
  .layout.horizontal {
    -ms-flex-direction: row;
    -webkit-flex-direction: row;
    flex-direction: row;
  }
  .layout.vertical {
    -ms-flex-direction: column;
    -webkit-flex-direction: column;
    flex-direction: column;
  }
  .layout.wrap {
    -ms-flex-wrap: wrap;
    -webkit-flex-wrap: wrap;
    flex-wrap: wrap;
  }
  .layout.no-wrap {
    -ms-flex-wrap: nowrap;
    -webkit-flex-wrap: nowrap;
    flex-wrap: nowrap;
  }
  .layout.center,
  .layout.center-center {
    -ms-flex-align: center;
    -webkit-align-items: center;
    align-items: center;
  }
  .layout.center-justified,
  .layout.center-center {
    -ms-flex-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
  }
  .flex {
    -ms-flex: 1 1 0.000000001px;
    -webkit-flex: 1;
    flex: 1;
    -webkit-flex-basis: 0.000000001px;
    flex-basis: 0.000000001px;
  }
  .flex-auto {
    -ms-flex: 1 1 auto;
    -webkit-flex: 1 1 auto;
    flex: 1 1 auto;
  }
  .flex-none {
    -ms-flex: none;
    -webkit-flex: none;
    flex: none;
  }
  .layout.justified {
    -ms-flex-pack: justify;
    -webkit-justify-content: space-between;
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

  .paper-dialog-buttons .warning {
    --mdc-theme-primary: var(--google-red-500);
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
`;
