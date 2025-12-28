import { css } from "lit";

export const moreInfoControlStyle = css`
  :host {
    display: flex;
    flex-direction: column;
    flex: 1;
    justify-content: space-between;
  }

  .controls {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .controls:not(:last-child) {
    margin-bottom: var(--ha-space-6);
  }

  .controls > *:not(:last-child) {
    margin-bottom: var(--ha-space-6);
  }

  .buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--ha-space-3);
  }

  .buttons > * {
    margin: var(--ha-space-2);
  }

  ha-attributes {
    display: block;
    width: 100%;
  }
  ha-more-info-control-select-container + ha-attributes:not([empty]) {
    margin-top: var(--ha-space-4);
  }
`;
