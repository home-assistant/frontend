import { css } from "lit";

export const onBoardingStyles = css`
  .card-content {
    padding: 32px;
  }
  h1 {
    font-weight: 400;
    font-size: var(--ha-font-size-3xl);
    line-height: 36px;
    margin-bottom: 8px;
  }
  ha-icon-button-arrow-prev {
    margin-left: -12px;
    display: block;
  }
  p {
    font-size: var(--ha-font-size-m);
    line-height: 1.5rem;
    margin-top: 0;
    margin-bottom: 32px;
  }
  .footer {
    margin-top: 16px;
    text-align: right;
  }
`;
