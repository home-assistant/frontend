import { css } from "lit";

export const cloudSignedOutStyle = css`
  .content {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding-bottom: calc(var(--safe-area-inset-bottom) + var(--ha-space-6));
  }
  ha-card {
    width: 100%;
    margin-bottom: 0;
  }
  h2 {
    margin: 0;
    font-size: var(--ha-font-size-2xl);
    font-weight: var(--ha-font-weight-normal);
    line-height: var(--ha-line-height-condensed);
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    text-wrap: balance;
  }
`;
