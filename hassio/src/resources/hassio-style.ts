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
    font-family: var(--paper-font-headline_-_font-family);
    -webkit-font-smoothing: var(--paper-font-headline_-_-webkit-font-smoothing);
    font-size: var(--paper-font-headline_-_font-size);
    font-weight: var(--paper-font-headline_-_font-weight);
    letter-spacing: var(--paper-font-headline_-_letter-spacing);
    line-height: var(--paper-font-headline_-_line-height);
    padding-left: 8px;
  }
  .description {
    margin-top: 4px;
    padding-left: 8px;
  }
  .card-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    grid-gap: 8px;
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
