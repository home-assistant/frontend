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
    margin-bottom: 24px;
  }

  .controls > *:not(:last-child) {
    margin-bottom: 24px;
  }

  .buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
  }

  .buttons > * {
    margin: 8px;
  }

  ha-attributes {
    display: block;
    width: 100%;
  }
  ha-more-info-control-select-container + ha-attributes:not([empty]) {
    margin-top: 16px;
  }
`;
