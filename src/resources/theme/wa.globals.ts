import { css } from "lit";
import { extractDerivedVars } from "../../common/style/derived-css-vars";

export const waMainStyles = css`
  html {
    --wa-focus-ring-style: solid;
    --wa-focus-ring-width: 2px;
    --wa-focus-ring-offset: 2px;
    --wa-focus-ring: var(--wa-focus-ring-style) var(--wa-focus-ring-width)
      var(--wa-focus-ring-color);
  }
`;

export const waMainDerivedVariables = extractDerivedVars(waMainStyles);
