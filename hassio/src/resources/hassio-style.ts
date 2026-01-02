import { css } from "lit";

export const hassioStyle = css`
  .content {
    margin: 8px;
  }
  h1,
  .description,
  .card-content {
    color: var(--primary-text-color);
  }
  h1 {
    font-size: 2em;
    margin-bottom: 8px;
    font-family: var(--ha-font-family-body);
    -webkit-font-smoothing: var(--ha-font-smoothing);
    -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
    font-size: var(--ha-font-size-2xl);
    font-weight: var(--ha-font-weight-normal);
    line-height: var(--ha-line-height-condensed);
    padding-left: 8px;
    padding-inline-start: 8px;
    padding-inline-end: initial;
  }
  .description {
    margin-top: 4px;
    padding-left: 8px;
    padding-inline-start: 8px;
    padding-inline-end: initial;
  }
  .card-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    grid-gap: var(--ha-space-2);
  }
  @media screen and (min-width: 640px) {
    .card-group {
      grid-template-columns: repeat(auto-fit, minmax(300px, 0.5fr));
    }
  }
  @media screen and (min-width: 1020px) {
    .card-group {
      grid-template-columns: repeat(auto-fit, minmax(300px, 0.333fr));
    }
  }
  @media screen and (min-width: 1300px) {
    .card-group {
      grid-template-columns: repeat(auto-fit, minmax(300px, 0.25fr));
    }
  }
  .error {
    color: var(--error-color);
    margin-top: 16px;
  }
`;
