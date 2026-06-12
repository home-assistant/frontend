import { css } from "lit";
import { extractVars } from "../../common/style/derived-css-vars";

/**
 * Semantic styles use core styles to define higher level variables like box shadows.
 * Here we define all styles except colors
 */
export const semanticStyles = css`
  html {
    --ha-box-shadow-s: 0 1px 2px 0 rgba(0, 0, 0, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.12);
    --ha-box-shadow-m: 0 3px 6px -1px rgba(0, 0, 0, 0.1), 0 8px 16px -2px rgba(0, 0, 0, 0.15);
    --ha-box-shadow-l: 0 6px 12px -3px rgba(0, 0, 0, 0.12), 0 16px 32px -6px rgba(0, 0, 0, 0.2);
  }
`;

export const darkSemanticStyles = css`
  html {
    --ha-box-shadow-s: 0 1px 2px 0 rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.5);
    --ha-box-shadow-m: 0 3px 6px -1px rgba(0, 0, 0, 0.35), 0 8px 16px -2px rgba(0, 0, 0, 0.45);
    --ha-box-shadow-l: 0 6px 12px -3px rgba(0, 0, 0, 0.4), 0 16px 32px -6px rgba(0, 0, 0, 0.55);
  }
`;

export const darkSemanticVariables = extractVars(darkSemanticStyles);
