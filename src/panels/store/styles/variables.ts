import { css } from "lit";

export const storeStyleVariables = css`
  :host {
    --store-color-error: var(--error-color);
    --store-color-icon: var(--primary-text-color);
    --store-color-link: var(--link-text-color, var(--accent-color));
  }
`;
