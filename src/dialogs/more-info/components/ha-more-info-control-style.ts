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

  .controls > *:not(:last-child) {
    margin-bottom: 24px;
  }

  ha-attributes {
    width: 100%;
  }
`;
