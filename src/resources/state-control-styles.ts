import { css } from "lit";

/**
 * Shared styles for state control toggle components
 * Used by: cover, valve, lock, fan, light toggle controls
 */
export const stateControlToggleStyle = css`
  ha-control-switch {
    height: 45vh;
    max-height: 320px;
    min-height: 200px;
    --control-switch-thickness: 130px;
    --control-switch-border-radius: var(--ha-border-radius-6xl);
    --control-switch-padding: 6px;
    --mdc-icon-size: 24px;
  }

  .buttons {
    display: flex;
    flex-direction: column;
    width: 130px;
    height: 45vh;
    max-height: 320px;
    min-height: 200px;
    padding: 6px;
    box-sizing: border-box;
  }

  ha-control-button {
    flex: 1;
    width: 100%;
    --control-button-border-radius: var(--ha-border-radius-6xl);
    --mdc-icon-size: 24px;
  }

  ha-control-button.active {
    --control-button-icon-color: white;
    --control-button-background-color: var(--color);
    --control-button-focus-color: var(--color);
    --control-button-background-opacity: 1;
  }

  ha-control-button:not(:last-child) {
    margin-bottom: 6px;
  }
`;

/**
 * Additional styles for components with pulse animation (like lock toggle)
 */
export const stateControlPulseStyle = css`
  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  .pulse {
    animation: pulse 1s infinite;
  }
`;
