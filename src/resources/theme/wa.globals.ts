import { css } from "lit";
import { extractDerivedVars } from "../../common/style/derived-css-vars";

export const waMainStyles = css`
  html {
    --wa-focus-ring-style: solid;
    --wa-focus-ring-width: 2px;
    --wa-focus-ring-offset: 2px;
    --wa-focus-ring: var(--wa-focus-ring-style) var(--wa-focus-ring-width) var(--wa-focus-ring-color);

    --wa-space-l: 24px;
    --wa-shadow-l: 0 8px 8px -4px rgba(0, 0, 0, 0.2);
    --wa-form-control-padding-block: 0.75em;
  }
`;

export const waMainDerivedVariables = extractDerivedVars(waMainStyles);
