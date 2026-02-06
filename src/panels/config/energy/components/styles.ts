import { css } from "lit";

export const energyCardStyles = css`
  ha-card {
    height: 100%;
  }
  .card-header ha-svg-icon {
    height: 32px;
    width: 32px;
    margin-right: 8px;
    margin-inline-end: 8px;
    margin-inline-start: initial;
    direction: var(--direction);
  }
  h3 {
    margin-top: 24px;
    margin-bottom: 4px;
  }
  .row {
    display: flex;
    align-items: center;
    height: 48px;
    box-sizing: border-box;
  }
  .row ha-svg-icon,
  .row ha-icon,
  .row img {
    margin-right: 16px;
    margin-inline-end: 16px;
    margin-inline-start: initial;
    direction: var(--direction);
  }
  .row img {
    height: 24px;
  }
  .row .content {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  ha-icon-button {
    color: var(--secondary-text-color);
  }
  p {
    color: var(--secondary-text-color);
  }
  p a {
    color: var(--primary-color);
  }
  hr {
    border: none;
    border-top: 1px solid var(--divider-color);
    margin: 24px calc(var(--ha-space-4) * -1);
  }
  .items-container {
    border: 1px solid var(--ha-color-border-neutral-quiet);
    border-radius: var(--ha-border-radius-lg);
    padding: var(--ha-space-2);
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-2);
  }
`;
