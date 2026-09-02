import { css } from "lit";

export const hacsStyleVariables = css`
  :host {
    --hcv-color-error: var(--hacs-error-color, var(--error-color));
    --hcv-color-warning: var(--hacs-warning-color, var(--warning-color));
    --hcv-color-update: var(--hacs-update-color, var(--info-color));
    --hcv-color-new: var(--hacs-new-color, var(--success-color));
    --hcv-color-icon: var(--hacs-default-icon-color, var(--primary-text-color));

    --hcv-text-color-primary: var(--primary-text-color);
    --hcv-text-color-on-background: var(--text-primary-color);
    --hcv-text-color-secondary: var(--secondary-text-color);
    --hcv-text-color-link: var(--link-text-color, var(--accent-color));

    --mdc-dialog-heading-ink-color: var(--hcv-text-color-primary);
    --mdc-dialog-content-ink-color: var(--hcv-text-color-primary);
  }
`;
