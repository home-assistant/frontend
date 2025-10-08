import scrollLockStyles from "@home-assistant/webawesome/dist/styles/utilities/scroll-lock.css.js";
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

    --wa-font-weight-action: var(--ha-font-weight-medium);
    --wa-transition-fast: 75ms;
    --wa-transition-easing: ease;
    --wa-border-width-s: var(--ha-border-width-sm);
    --wa-border-width-m: var(--ha-border-width-md);
    --wa-border-width-l: var(--ha-border-width-lg);
    --wa-border-radius-s: var(--ha-border-radius-sm);
    --wa-border-radius-m: var(--ha-border-radius-md);
    --wa-border-radius-l: var(--ha-border-radius-lg);

    --wa-line-height-condensed: 1.25;

    --wa-space-xl: 32px;
  }

  ${scrollLockStyles}
`;

export const waMainDerivedVariables = extractDerivedVars(waMainStyles);
