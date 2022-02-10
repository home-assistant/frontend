import { css } from "lit";

export const configElementStyle = css`
  ha-switch {
    padding: 16px 6px;
  }
  .side-by-side {
    display: flex;
    align-items: flex-end;
  }
  .side-by-side > * {
    flex: 1;
    padding-right: 8px;
  }
  .side-by-side > *:last-child {
    flex: 1;
    padding-right: 0;
  }
  .suffix {
    margin: 0 8px;
  }
  hui-theme-select-editor,
  hui-action-editor,
  mwc-select,
  ha-textfield,
  ha-icon-picker {
    margin-top: 8px;
  }
`;
