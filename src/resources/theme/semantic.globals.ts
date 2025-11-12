import { css } from "lit";
import { extractVars } from "../../common/style/derived-css-vars";

/**
 * Semantic styles use core styles to define higher level variables like box shadows.
 * Here we define all styles except colors
 */
export const semanticStyles = css`
  html {
    --ha-box-shadow-s: var(--ha-shadow-offset-x-s) var(--ha-shadow-offset-y-s) var(--ha-shadow-blur-s) var(--ha-shadow-spread-s) var(--ha-color-shadow-light);
    --ha-box-shadow-m: var(--ha-shadow-offset-x-m) var(--ha-shadow-offset-y-m) var(--ha-shadow-blur-m) var(--ha-shadow-spread-m) var(--ha-color-shadow-light);
    --ha-box-shadow-l: var(--ha-shadow-offset-x-l) var(--ha-shadow-offset-y-l) var(--ha-shadow-blur-l) var(--ha-shadow-spread-l) var(--ha-color-shadow-light);
  }
`;

export const darkSemanticStyles = css`
  html {
    --ha-box-shadow-s: var(--ha-shadow-offset-x-s) var(--ha-shadow-offset-y-s) var(--ha-shadow-blur-s) var(--ha-shadow-spread-s) var(--ha-color-shadow-dark);
    --ha-box-shadow-m: var(--ha-shadow-offset-x-m) var(--ha-shadow-offset-y-m) var(--ha-shadow-blur-m) var(--ha-shadow-spread-m) var(--ha-color-shadow-dark);
    --ha-box-shadow-l: var(--ha-shadow-offset-x-l) var(--ha-shadow-offset-y-l) var(--ha-shadow-blur-l) var(--ha-shadow-spread-l) var(--ha-color-shadow-dark);
  }
`;

export const darkSemanticVariables = extractVars(darkSemanticStyles);
