import { css } from "lit";

export const rowStyles = css`
  ha-icon-button {
    --mdc-theme-text-primary-on-background: var(--primary-text-color);
  }
  ha-expansion-panel {
    --expansion-panel-summary-padding: 0 0 0 8px;
    --expansion-panel-content-padding: 0;
  }
  h3 {
    font-size: inherit;
    font-weight: inherit;
  }

  ha-card {
    transition: outline 0.2s;
  }
  .disabled-bar {
    background: var(--divider-color, #e0e0e0);
    text-align: center;
    border-top-right-radius: calc(
      var(--ha-card-border-radius, 12px) - var(--ha-card-border-width, 1px)
    );
    border-top-left-radius: calc(
      var(--ha-card-border-radius, 12px) - var(--ha-card-border-width, 1px)
    );
  }
  .warning ul {
    margin: 4px 0;
  }
  ha-md-menu-item > ha-svg-icon {
    --mdc-icon-size: 24px;
  }
  ha-tooltip {
    cursor: default;
  }
  :host([highlight]) ha-card {
    --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
    --shadow-focus: 0 0 0 1px var(--state-inactive-color);
    border-color: var(--state-inactive-color);
    box-shadow: var(--shadow-default), var(--shadow-focus);
  }
`;

export const editorStyles = css`
  .disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .card-content {
    padding: 16px;
  }
  .card-content.yaml {
    padding: 0 1px;
    border-top: 1px solid var(--divider-color);
    border-bottom: 1px solid var(--divider-color);
  }
  .card-content.indent {
    margin-left: 12px;
    margin-right: -4px;
    padding: 12px 20px 16px 16px;
    border-left: 2px solid var(--ha-color-border-neutral-normal);
  }
  .card-content.indent.selected,
  :host([selected]) .card-content.indent {
    border-color: var(--primary-color);
  }
`;

export const saveFabStyles = css`
  :host {
    overflow: hidden;
  }
  ha-fab {
    position: absolute;
    right: 16px;
    bottom: calc(-80px - var(--safe-area-inset-bottom));
    transition: bottom 0.3s;
  }
  ha-fab.dirty {
    bottom: 16px;
  }
`;
