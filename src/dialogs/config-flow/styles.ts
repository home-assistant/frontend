import { css } from "lit";

export const configFlowContentStyles = css`
  h2 {
    margin: 24px 38px 0 0;
    margin-inline-start: 0px;
    margin-inline-end: 38px;
    padding: 0 24px;
    padding-inline-start: 24px;
    padding-inline-end: 24px;
    -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
    -webkit-font-smoothing: var(--ha-font-smoothing);
    font-family: var(
      --mdc-typography-headline6-font-family,
      var(--mdc-typography-font-family, var(--ha-font-family-body))
    );
    font-size: var(--mdc-typography-headline6-font-size, var(--ha-font-size-l));
    line-height: var(--mdc-typography-headline6-line-height, 2rem);
    font-weight: var(
      --mdc-typography-headline6-font-weight,
      var(--ha-font-weight-medium)
    );
    letter-spacing: var(--mdc-typography-headline6-letter-spacing, 0.0125em);
    text-decoration: var(--mdc-typography-headline6-text-decoration, inherit);
    text-transform: var(--mdc-typography-headline6-text-transform, inherit);
    box-sizing: border-box;
  }

  .content,
  .preview {
    margin-top: 20px;
    padding: 0 24px;
  }

  .buttons {
    position: relative;
    padding: 16px;
    margin: 8px 0 0;
    color: var(--primary-color);
    display: flex;
    justify-content: flex-end;
  }

  ha-markdown {
    overflow-wrap: break-word;
  }
  ha-markdown a {
    color: var(--primary-color);
  }
  ha-markdown img:first-child:last-child {
    display: block;
    margin: 0 auto;
  }
`;
