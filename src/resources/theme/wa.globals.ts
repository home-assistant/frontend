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
    --wa-space-xl: var(--ha-space-8);

    --wa-form-control-padding-block: 0.75em;
    --wa-form-control-value-line-height: var(--ha-line-height-condensed);

    --wa-font-weight-action: var(--ha-font-weight-medium);
    --wa-transition-normal: 150ms;
    --wa-transition-fast: 75ms;
    --wa-transition-easing: ease;

    --wa-border-style: solid;
    --wa-border-width-s: var(--ha-border-width-sm);
    --wa-border-width-m: var(--ha-border-width-md);
    --wa-border-width-l: var(--ha-border-width-lg);
    --wa-border-radius-s: var(--ha-border-radius-sm);
    --wa-border-radius-m: var(--ha-border-radius-md);
    --wa-border-radius-l: var(--ha-border-radius-lg);

    --wa-line-height-condensed: var(--ha-line-height-condensed);

    --wa-font-size-m: var(--ha-font-size-m);
    --wa-shadow-s: var(--ha-box-shadow-s);
    --wa-shadow-m: var(--ha-box-shadow-m);
    --wa-shadow-l: var(--ha-box-shadow-l);
  }

  ${scrollLockStyles}
`;

export const waMainDerivedVariables = extractDerivedVars(waMainStyles);
