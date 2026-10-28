import { css } from "lit";

// Shared layout for the weather page cards: a small header with an icon,
// a large value and a short note below it.
export const weatherCardStyles = css`
  :host {
    display: block;
    height: 100%;
  }
  ha-card {
    height: 100%;
    box-sizing: border-box;
    padding: var(--ha-space-4);
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-2);
  }
  .header {
    display: flex;
    align-items: center;
    gap: var(--ha-space-2);
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s);
    font-weight: var(--ha-font-weight-medium);
    line-height: var(--ha-line-height-condensed);
  }
  .header ha-svg-icon {
    --mdc-icon-size: 18px;
  }
  .title {
    margin: 0;
    font-size: var(--ha-font-size-l);
    font-weight: var(--ha-font-weight-bold);
    line-height: var(--ha-line-height-condensed);
    color: var(--primary-text-color);
  }
  .value {
    display: flex;
    align-items: baseline;
    gap: var(--ha-space-1);
    flex-wrap: wrap;
  }
  .value .number {
    font-size: var(--ha-font-size-3xl);
    font-weight: var(--ha-font-weight-normal);
    line-height: var(--ha-line-height-condensed);
    font-variant-numeric: tabular-nums;
  }
  .value .unit,
  .value .context {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s);
  }
  .level {
    display: flex;
    align-items: center;
    gap: var(--ha-space-2);
    font-size: var(--ha-font-size-s);
    font-weight: var(--ha-font-weight-medium);
  }
  .level .dot {
    width: 8px;
    height: 8px;
    border-radius: var(--ha-border-radius-circle);
    flex: none;
  }
  .note {
    margin-top: auto;
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s);
    line-height: var(--ha-line-height-normal);
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-2);
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--ha-space-2);
    font-size: var(--ha-font-size-m);
  }
  .row .label {
    color: var(--secondary-text-color);
  }
  .row .data {
    font-variant-numeric: tabular-nums;
    text-align: end;
  }
`;
