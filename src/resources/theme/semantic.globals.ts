import { css } from "lit";
import { extractVars } from "../../common/style/derived-css-vars";

/**
 * Semantic styles use core styles to define higher level variables like box shadows.
 * Here we define all styles except colors
 */
export const semanticStyles = css`
  html {
    --ha-box-shadow-s: 0 1px 2px 0 rgba(0, 0, 0, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.12);
    --ha-box-shadow-m: 0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 4px 8px 0 rgba(0, 0, 0, 0.14);
    --ha-box-shadow-l: 0 4px 8px -2px rgba(0, 0, 0, 0.12), 0 12px 24px -4px rgba(0, 0, 0, 0.18);
    --ha-box-shadow-xl: 0 8px 16px -4px rgba(0, 0, 0, 0.15), 0 24px 48px -8px rgba(0, 0, 0, 0.25);
  }
`;

export const darkSemanticStyles = css`
  html {
    --ha-box-shadow-s: 0 1px 2px 0 rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.5);
    --ha-box-shadow-m: 0 2px 4px -1px rgba(0, 0, 0, 0.4), 0 4px 8px 0 rgba(0, 0, 0, 0.5);
    --ha-box-shadow-l: 0 4px 8px -2px rgba(0, 0, 0, 0.4), 0 12px 24px -4px rgba(0, 0, 0, 0.55);
    --ha-box-shadow-xl: 0 8px 16px -4px rgba(0, 0, 0, 0.45), 0 24px 48px -8px rgba(0, 0, 0, 0.6);
  }
`;

export const darkSemanticVariables = extractVars(darkSemanticStyles);
