import { css } from "lit";

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
    --mdc-dialog-max-width: min(600px, 95vw);
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
      --vertical-align-dialog: flex-end;
      --ha-dialog-border-radius: 0;
    }
  }
  mwc-button.warning,
  ha-button.warning {
    --mdc-theme-primary: var(--error-color);
  }
  .error {
    color: var(--error-color);
  }
`;

export const haStyleSidebarItem = css`
  :host {
    padding-inline: 12px;
  }
  .item {
    --rgb-text: var(--rgb-sidebar-text-color);
    background-color: transparent;
    color: rgb(var(--rgb-text));
    text-decoration: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: inherit;
    font-weight: 500;
    font-size: 14px;
    line-height: 20px;

    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--sidebar-item-radius, 25px);
    height: 50px;
  }
  .item .icon {
    position: relative;
    text-align: left;
    width: 24px;
  }
  .item .name {
    display: none;
    white-space: nowrap;
  }
  .item:hover {
    color: rgb(var(--rgb-text));
    background-color: rgba(var(--rgb-text), 0.08);
  }
  .item:focus-visible {
    outline: none;
  }
  .item:focus-visible,
  .item:active {
    color: rgb(var(--rgb-text));
    background-color: rgba(var(--rgb-text), 0.12);
  }
  .item[aria-selected="true"] {
    --rgb-text: var(--rgb-sidebar-selected-color);
    background-color: rgba(var(--rgb-text), 0.12);
  }
  .item[aria-selected="true"]:focus-visible {
    background-color: rgba(var(--rgb-text), 0.2);
  }
  .item.expanded {
    padding-inline-start: 16px;
    padding-inline-end: 24px;
    justify-content: initial;
  }
  .item.expanded .icon {
    margin-inline-end: 12px;
  }
  .item.expanded .name {
    display: initial;
  }
  .target {
    position: absolute;
    top: 0;
    bottom: 0;
    left: -12px;
    right: -12px;
  }
  .badge {
    position: absolute;
    top: 0;
    right: 0;
    width: 16px;
    height: 16px;
    transform: translateX(50%);
    border-radius: 8px;
    background-color: var(--accent-color);
    color: var(--text-accent-color, var(--text-primary-color));
    font-weight: 500;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .count {
    margin-inline-start: auto;
    margin-inline-end: -9px;
    background-color: var(--accent-color);
    color: var(--text-accent-color, var(--text-primary-color));
    padding: 0 6px;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    box-sizing: border-box;
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
