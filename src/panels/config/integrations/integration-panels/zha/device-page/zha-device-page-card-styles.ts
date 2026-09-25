import { css } from "lit";

export const zhaDevicePageCardStyles = css`
  :host {
    display: block;
  }

  .device-page-card {
    overflow: hidden;
  }

  .card-header {
    padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
  }

  .card-title {
    font-size: var(--ha-font-size-xl);
    font-weight: var(--ha-font-weight-medium);
    line-height: var(--ha-line-height-condensed);
  }

  .card-description {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-m);
    margin-top: var(--ha-space-1);
  }
`;
