import { css } from "lit";

export const iconColorCSS = css`
  ha-state-icon[data-active][data-domain="alert"],
  ha-state-icon[data-active][data-domain="automation"],
  ha-state-icon[data-active][data-domain="binary_sensor"],
  ha-state-icon[data-active][data-domain="calendar"],
  ha-state-icon[data-active][data-domain="camera"],
  ha-state-icon[data-active][data-domain="cover"],
  ha-state-icon[data-active][data-domain="device_tracker"],
  ha-state-icon[data-active][data-domain="fan"],
  ha-state-icon[data-active][data-domain="humidifier"],
  ha-state-icon[data-active][data-domain="light"],
  ha-state-icon[data-active][data-domain="input_boolean"],
  ha-state-icon[data-active][data-domain="lock"],
  ha-state-icon[data-active][data-domain="media_player"],
  ha-state-icon[data-active][data-domain="remote"],
  ha-state-icon[data-active][data-domain="script"],
  ha-state-icon[data-active][data-domain="sun"],
  ha-state-icon[data-active][data-domain="switch"],
  ha-state-icon[data-active][data-domain="timer"],
  ha-state-icon[data-active][data-domain="vacuum"],
  ha-state-icon[data-active][data-domain="group"] {
    color: var(--paper-item-icon-active-color, #fdd835);
  }

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
