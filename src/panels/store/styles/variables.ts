import { css } from "lit";

export const storeStyleVariables = css`
  :host {
    --hcv-color-error: var(--store-error-color, var(--error-color));
    --hcv-color-warning: var(--store-warning-color, var(--warning-color));
    --hcv-color-update: var(--store-update-color, var(--info-color));
    --hcv-color-new: var(--store-new-color, var(--success-color));
    --hcv-color-icon: var(
      --store-default-icon-color,
      var(--primary-text-color)
    );

    --hcv-text-color-primary: var(--primary-text-color);
    --hcv-text-color-on-background: var(--text-primary-color);
    --hcv-text-color-secondary: var(--secondary-text-color);
    --hcv-text-color-link: var(--link-text-color, var(--accent-color));

    --mdc-dialog-heading-ink-color: var(--hcv-text-color-primary);
    --mdc-dialog-content-ink-color: var(--hcv-text-color-primary);
  }
`;
