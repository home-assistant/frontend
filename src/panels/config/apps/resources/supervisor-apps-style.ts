import { css } from "lit";

export const supervisorAppsStyle = css`
  .content {
    margin: var(--ha-space-2);
  }
  h1,
  .description,
  .card-content {
    color: var(--primary-text-color);
  }
  h1 {
    font-size: 2em;
    margin-bottom: var(--ha-space-2);
    font-family: var(--ha-font-family-body);
    -webkit-font-smoothing: var(--ha-font-smoothing);
    -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
    font-size: var(--ha-font-size-2xl);
    font-weight: var(--ha-font-weight-normal);
    line-height: var(--ha-line-height-condensed);
    padding-left: var(--ha-space-2);
    padding-inline-start: var(--ha-space-2);
    padding-inline-end: initial;
  }
  .description {
    margin-top: var(--ha-space-1);
    padding-left: var(--ha-space-2);
    padding-inline-start: var(--ha-space-2);
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
    margin-top: var(--ha-space-4);
  }
`;
