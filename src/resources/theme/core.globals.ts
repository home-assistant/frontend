import { css } from "lit";
import { extractDerivedVars } from "../../common/style/derived-css-vars";

export const coreStyles = css`
  html {
    --border-width-sm: 1px;
    --border-width-md: 2px;
    --border-width-lg: 3px;

    --border-radius-sm: 4px;
    --border-radius-md: 8px;
    --border-radius-lg: 12px;
    --border-radius-xl: 16px;
    --border-radius-2xl: 24px;
    --border-radius-3xl: 28px;
    --border-radius-4xl: 32px;
    --border-radius-5xl: 36px;
    --border-radius-pill: 9999px;
    --border-radius-circle: 50%;
    --border-radius-square: 0;
  }
`;

export const coreDerivedVariables = extractDerivedVars(coreStyles);
