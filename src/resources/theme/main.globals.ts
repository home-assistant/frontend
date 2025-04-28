import { css } from "lit";
import { extractDerivedVars } from "../../common/style/derived-css-vars";

export const mainStyles = css`
  html {
    height: 100vh;

    /* for header */
    --header-height: 56px;

    /* opacity for dark text on a light background */
    --dark-divider-opacity: 0.12;
    --dark-disabled-opacity: 0.38; /* or hint text or icon */
    --dark-secondary-opacity: 0.54;
    --dark-primary-opacity: 0.87;

    /* opacity for light text on a dark background */
    --light-divider-opacity: 0.12;
    --light-disabled-opacity: 0.3; /* or hint text or icon */
    --light-secondary-opacity: 0.7;
    --light-primary-opacity: 1;

    direction: ltr;
    --direction: ltr;
    --float-start: left;
    --float-end: right;
    --margin-title-ltr: 0 0 0 24px;
    --margin-title-rtl: 0 24px 0 0;

    /* Vaadin typography */
    --material-h6-font-size: var(--ha-font-size-m);
    --material-small-font-size: var(--ha-font-size-xs);
    --material-caption-font-size: var(--ha-font-size-2xs);
    --material-button-font-size: var(--ha-font-size-xs);
  }
`;

export const mainDerivedVariables = extractDerivedVars(mainStyles);
