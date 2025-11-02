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
    --ha-border-radius-5xl: 32px;
    --ha-border-radius-6xl: 36px;
    --ha-border-radius-pill: 9999px;
    --ha-border-radius-circle: 50%;
    --ha-border-radius-square: 0;

    /* Spacing */
    --ha-space-0: 0px;
    --ha-space-1: 4px;
    --ha-space-2: 8px;
    --ha-space-3: 12px;
    --ha-space-4: 16px;
    --ha-space-5: 20px;
    --ha-space-6: 24px;
    --ha-space-7: 28px;
    --ha-space-8: 32px;
    --ha-space-9: 36px;
    --ha-space-10: 40px;
    --ha-space-11: 44px;
    --ha-space-12: 48px;
    --ha-space-13: 52px;
    --ha-space-14: 56px;
    --ha-space-15: 60px;
    --ha-space-16: 64px;
    --ha-space-17: 68px;
    --ha-space-18: 72px;
    --ha-space-19: 76px;
    --ha-space-20: 80px;

    /* Shadow tokens */
    --ha-shadow-offset-x-sm: 0px;
    --ha-shadow-offset-x-md: 0px;
    --ha-shadow-offset-x-lg: 0px;
    --ha-shadow-offset-y-sm: 2px;
    --ha-shadow-offset-y-md: 4px;
    --ha-shadow-offset-y-lg: 8px;
    --ha-shadow-blur-sm: 4px;
    --ha-shadow-blur-md: 8px;
    --ha-shadow-blur-lg: 12px;
    --ha-shadow-spread-sm: 0px;
    --ha-shadow-spread-md: 0px;
    --ha-shadow-spread-lg: 0px;

    /* Compound shadow styles */
    --ha-shadow-sm: var(--ha-shadow-offset-x-sm) var(--ha-shadow-offset-y-sm) var(--ha-shadow-blur-sm) var(--ha-shadow-spread-sm) var(--ha-color-shadow);
    --ha-shadow-md: var(--ha-shadow-offset-x-md) var(--ha-shadow-offset-y-md) var(--ha-shadow-blur-md) var(--ha-shadow-spread-md) var(--ha-color-shadow);
    --ha-shadow-lg: var(--ha-shadow-offset-x-lg) var(--ha-shadow-offset-y-lg) var(--ha-shadow-blur-lg) var(--ha-shadow-spread-lg) var(--ha-color-shadow);
  }
`;

export const coreDerivedVariables = extractDerivedVars(coreStyles);
