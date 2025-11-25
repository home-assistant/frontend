import { css } from "lit";
import { extractVars } from "../../common/style/derived-css-vars";

/**
 * Semantic styles use core styles to define higher level variables like box shadows.
 * Here we define all styles except colors
 */
export const semanticStyles = css`
  html {
    --ha-box-shadow-s: var(--ha-shadow-offset-x-sm) var(--ha-shadow-offset-y-sm) var(--ha-shadow-blur-sm) var(--ha-shadow-spread-sm) var(--ha-color-shadow-light);
    --ha-box-shadow-m: var(--ha-shadow-offset-x-md) var(--ha-shadow-offset-y-md) var(--ha-shadow-blur-md) var(--ha-shadow-spread-md) var(--ha-color-shadow-light);
    --ha-box-shadow-l: var(--ha-shadow-offset-x-lg) var(--ha-shadow-offset-y-lg) var(--ha-shadow-blur-lg) var(--ha-shadow-spread-lg) var(--ha-color-shadow-light);
  }
`;

export const darkSemanticStyles = css`
  html {
    --ha-box-shadow-s: var(--ha-shadow-offset-x-sm) var(--ha-shadow-offset-y-sm) var(--ha-shadow-blur-sm) var(--ha-shadow-spread-sm) var(--ha-color-shadow-dark);
    --ha-box-shadow-m: var(--ha-shadow-offset-x-md) var(--ha-shadow-offset-y-md) var(--ha-shadow-blur-md) var(--ha-shadow-spread-md) var(--ha-color-shadow-dark);
    --ha-box-shadow-l: var(--ha-shadow-offset-x-lg) var(--ha-shadow-offset-y-lg) var(--ha-shadow-blur-lg) var(--ha-shadow-spread-lg) var(--ha-color-shadow-dark);
  }
`;

export const darkSemanticVariables = extractVars(darkSemanticStyles);
