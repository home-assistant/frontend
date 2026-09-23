import { css } from "lit";

export const marketplaceStyleVariables = css`
  :host {
    --marketplace-color-error: var(--error-color);
    --marketplace-color-icon: var(--primary-text-color);
    --marketplace-color-link: var(--link-text-color, var(--accent-color));
  }
`;
