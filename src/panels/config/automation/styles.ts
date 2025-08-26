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
    border-top-right-radius: var(
      --ha-card-border-radius,
      var(--ha-border-radius-lg)
    );
    border-top-left-radius: var(
      --ha-card-border-radius,
      var(--ha-border-radius-lg)
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
  .hidden {
    display: none;
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
    padding: 12px 24px 16px 16px;
    border-left: 2px solid var(--ha-color-border-neutral-quiet);
  }
  .card-content.indent.selected,
  :host([selected]) .card-content.indent {
    border-color: var(--primary-color);
    background-color: var(--ha-color-fill-primary-quiet-resting);
    border-top-right-radius: var(--ha-border-radius-xl);
    border-bottom-right-radius: var(--ha-border-radius-xl);
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

export const manualEditor = css`
  :host {
    display: block;
  }

  .split-view {
    display: flex;
    flex-direction: row;
    height: 100%;
    position: relative;
    gap: 16px;
  }

  .split-view.sidebar-hidden {
    gap: 0;
  }

  .content-wrapper {
    position: relative;
    flex: 6;
  }

  .content {
    padding: 32px 16px 64px 0;
    height: calc(100vh - 153px);
    height: calc(100dvh - 153px);
    overflow-y: auto;
    overflow-x: hidden;
  }

  .sidebar {
    padding: 12px 0;
    flex: 4;
    height: calc(100vh - 81px);
    height: calc(100dvh - 81px);
    width: 40%;
  }
  .split-view.sidebar-hidden .sidebar {
    border-color: transparent;
    border-width: 0;
    overflow: hidden;
    flex: 0;
    visibility: hidden;
  }

  .sidebar.overlay {
    position: fixed;
    bottom: 8px;
    right: 8px;
    height: calc(100% - 70px);
    padding: 0;
    z-index: 5;
    box-shadow: -8px 0 16px rgba(0, 0, 0, 0.2);
  }

  .sidebar.overlay.rtl {
    right: unset;
    left: 8px;
  }

  @media all and (max-width: 870px) {
    .split-view {
      gap: 0;
      margin-right: -8px;
    }
    .sidebar {
      height: 0;
      width: 0;
      flex: 0;
    }
  }

  .split-view.sidebar-hidden .sidebar.overlay {
    width: 0;
  }
  .description {
    margin: 0;
  }
  .header a {
    color: var(--secondary-text-color);
  }
`;

export const rows = css`
  .rows {
    padding: 16px 0 16px 16px;
    margin: -16px;
    margin-right: -20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .sortable-ghost {
    background: none;
    border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
  }
  .sortable-drag {
    background: none;
  }
  ha-automation-action-row {
    display: block;
    scroll-margin-top: 48px;
  }
  .handle {
    padding: 12px;
    cursor: move; /* fallback if grab cursor is unsupported */
    cursor: grab;
  }
  .handle ha-svg-icon {
    pointer-events: none;
    height: 24px;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    order: 1;
  }
`;

export const sidebarEditor = css`
  .sidebar-editor {
    display: block;
    padding-top: 16px;
  }
  .description {
    padding-top: 16px;
  }
`;
