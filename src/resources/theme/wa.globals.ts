import scrollLockStyles from "@home-assistant/webawesome/dist/styles/utilities/scroll-lock.css.js";
import { css } from "lit";
import { extractDerivedVars } from "../../common/style/derived-css-vars";

export const waMainStyles = css`
  html {
    --wa-focus-ring-style: solid;
    --wa-focus-ring-width: 2px;
    --wa-focus-ring-offset: 2px;
    --wa-focus-ring: var(--wa-focus-ring-style) var(--wa-focus-ring-width) var(--wa-focus-ring-color);

    --wa-space-xs: var(--ha-space-2);
    --wa-space-m: var(--ha-space-4);
    --wa-space-l: var(--ha-space-6);

    --wa-shadow-l: 0 8px 8px -4px rgba(0, 0, 0, 0.2);
    --wa-form-control-padding-block: 0.75em;
    --wa-form-control-value-line-height: var(--ha-line-height-condensed);

    --wa-font-weight-action: var(--ha-font-weight-medium);
    --wa-transition-normal: 150ms;
    --wa-transition-fast: 75ms;
    --wa-transition-easing: ease;
    --wa-border-width-l: var(--ha-border-radius-lg);
    --wa-space-xl: 32px;

    --wa-font-size-m: var(--ha-font-size-m);
  }

  ${scrollLockStyles}
`;

export const waMainDerivedVariables = extractDerivedVars(waMainStyles);
