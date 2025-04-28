import { css } from "lit";

export const onBoardingStyles = css`
  .card-content {
    padding: 32px;
  }
  h1 {
    font-weight: var(--ha-font-weight-normal);
    font-size: var(--ha-font-size-3xl);
    line-height: var(--ha-line-height-condensed);
    margin-bottom: 8px;
  }
  ha-icon-button-arrow-prev {
    margin-left: -12px;
    display: block;
  }
  p {
    font-size: var(--ha-font-size-m);
    line-height: var(--ha-line-height-normal);
    margin-top: 0;
    margin-bottom: 32px;
  }
  .footer {
    margin-top: 16px;
    text-align: right;
  }
`;
