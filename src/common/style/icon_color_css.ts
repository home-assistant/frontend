import { css } from "lit";

export const iconColorCSS = css`
  ha-state-icon[data-active][data-domain="alarm_control_panel"][data-state="pending"],
  ha-state-icon[data-active][data-domain="alarm_control_panel"][data-state="arming"],
  ha-state-icon[data-active][data-domain="alarm_control_panel"][data-state="triggered"] {
    animation: pulse 1s infinite;
  }

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

  /* Color the icon if unavailable */
  ha-state-icon[data-state="unavailable"] {
    color: var(--state-unavailable-color);
  }
`;
