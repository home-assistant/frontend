import { css } from "lit-element";

export const configElementStyle = css`
  ha-switch {
    padding: 16px 0;
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
  .header-footer-heading {
    font-size: 16px;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
  }
`;
