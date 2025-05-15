import { css } from "lit";
import {
  extractDerivedVars,
  extractVar,
} from "../../common/style/derived-css-vars";

export const typographyStyles = css`
  html {
    --ha-font-family-body: Roboto, Noto, sans-serif;
    --ha-font-family-code: monospace;
    --ha-font-family-longform: ui-sans-serif, system-ui, sans-serif;
    --md-list-item-label-text-font: var(--ha-font-family-body);
    --md-list-item-supporting-text-font: var(--ha-font-family-body);
    --md-list-item-trailing-supporting-text-font: var(--ha-font-family-body);

    font-size: 14px;
    --ha-font-size-scale: 1;
    --ha-font-size-xs: calc(10px * var(--ha-font-size-scale)); /* 0.714286rem */
    --ha-font-size-s: calc(12px * var(--ha-font-size-scale)); /* 0.857143rem */
    --ha-font-size-m: calc(14px * var(--ha-font-size-scale)); /* 1rem */
    --ha-font-size-l: calc(16px * var(--ha-font-size-scale)); /* 1.142857rem */
    --ha-font-size-xl: calc(20px * var(--ha-font-size-scale)); /* 1.428571rem */
    --ha-font-size-2xl: calc(
      24px * var(--ha-font-size-scale)
    ); /* 1.714286rem */
    --ha-font-size-3xl: calc(28px * var(--ha-font-size-scale)); /* 2rem */
    --ha-font-size-4xl: calc(
      32px * var(--ha-font-size-scale)
    ); /* 2.285714rem */
    --ha-font-size-5xl: calc(
      40px * var(--ha-font-size-scale)
    ); /* 2.857143rem */

    --ha-font-weight-light: 300;
    --ha-font-weight-normal: 400;
    --ha-font-weight-medium: 500;
    --ha-font-weight-bold: 700;

    --ha-font-family-heading: var(--ha-font-family-body);
    --ha-font-weight-body: var(--ha-font-weight-normal);
    --ha-font-weight-heading: var(--ha-font-weight-bold);
    --ha-font-weight-action: var(--ha-font-weight-medium);

    --ha-line-height-condensed: 1.2;
    --ha-line-height-normal: 1.6;
    --ha-line-height-expanded: 2;

    --ha-font-smoothing: antialiased;
    --ha-moz-osx-font-smoothing: grayscale;

    /* Vaadin typography */
    --material-h6-font-size: var(--ha-font-size-m);
    --material-small-font-size: var(--ha-font-size-xs);
    --material-caption-font-size: var(--ha-font-size-2xs);
    --material-button-font-size: var(--ha-font-size-xs);
  }
`;

export const typographyDerivedVariables = extractDerivedVars(typographyStyles);

export const haFontFamilyBody = extractVar(
  typographyStyles,
  "ha-font-family-body"
);

export const haFontSmoothing = extractVar(
  typographyStyles,
  "ha-font-smoothing"
);

export const haMozOsxFontSmoothing = extractVar(
  typographyStyles,
  "ha-moz-osx-font-smoothing"
);
