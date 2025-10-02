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
    font-family: var(--ha-font-family-body);
    -webkit-font-smoothing: var(--ha-font-smoothing);
    -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
    font-size: var(--ha-font-size-m);
    font-weight: var(--ha-font-weight-normal);
    line-height: var(--ha-line-height-normal);
  }

  app-header div[sticky] {
    height: 48px;
  }

  app-toolbar [main-title] {
    margin-left: 20px;
    margin-inline-start: 20px;
    margin-inline-end: initial;
  }

  h1 {
    font-family: var(--ha-font-family-heading);
    -webkit-font-smoothing: var(--ha-font-smoothing);
    -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
    font-size: var(--ha-font-size-2xl);
    font-weight: var(--ha-font-weight-normal);
    line-height: var(--ha-line-height-condensed);
  }

  h2 {
    font-family: var(--ha-font-family-body);
    -webkit-font-smoothing: var(--ha-font-smoothing);
    -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--ha-font-size-xl);
    font-weight: var(--ha-font-weight-medium);
    line-height: var(--ha-line-height-normal);
  }

  h3 {
    font-family: var(--ha-font-family-body);
    -webkit-font-smoothing: var(--ha-font-smoothing);
    -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
    font-size: var(--ha-font-size-l);
    font-weight: var(--ha-font-weight-normal);
    line-height: var(--ha-line-height-normal);
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
      --mdc-dialog-min-width: 100vw;
      --mdc-dialog-max-width: 100vw;
      --mdc-dialog-min-height: 100%;
      --mdc-dialog-max-height: 100%;
      --vertical-align-dialog: flex-end;
      --ha-dialog-border-radius: 0;
    }
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
