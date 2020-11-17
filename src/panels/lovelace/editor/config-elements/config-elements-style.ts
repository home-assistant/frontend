import { css } from "lit-element";

export const configElementStyle = css`
  ha-switch {
    padding: 16px 6px;
  }
  .side-by-side {
    display: flex;
  }
  .side-by-side > * {
    flex: 1;
    padding-right: 4px;
  }
  .suffix {
    margin: 0 8px;
  }
  ha-settings-row {
    padding: 0;
  }
  ha-expansion-panel {
    padding-top: 8px;
  }
  .advanced-title {
    font-size: 16px;
  }
`;
