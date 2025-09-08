import { css } from "lit";
import { extractDerivedVars } from "../../common/style/derived-css-vars";

export const coreStyles = css`
  html {
    --ha-border-width-sm: 1px;
    --ha-border-width-md: 2px;
    --ha-border-width-lg: 3px;

    --ha-border-radius-sm: 4px;
    --ha-border-radius-md: 8px;
    --ha-border-radius-lg: 12px;
    --ha-border-radius-xl: 16px;
    --ha-border-radius-2xl: 20px;
    --ha-border-radius-3xl: 24px;
    --ha-border-radius-4xl: 28px;
    --ha-border-radius-5xl: 23px;
    --ha-border-radius-6xl: 36px;
    --ha-border-radius-pill: 9999px;
    --ha-border-radius-circle: 50%;
    --ha-border-radius-square: 0;
  }
`;

export const coreDerivedVariables = extractDerivedVars(coreStyles);
