import { css } from "lit";

export const iconColorCSS = css`
  ha-state-icon[data-domain="alert"][data-state="on"],
  ha-state-icon[data-domain="automation"][data-state="on"],
  ha-state-icon[data-domain="binary_sensor"][data-state="on"],
  ha-state-icon[data-domain="calendar"][data-state="on"],
  ha-state-icon[data-domain="camera"][data-state="streaming"],
  ha-state-icon[data-domain="cover"][data-state="open"],
  ha-state-icon[data-domain="device_tracker"][data-state="home"],
  ha-state-icon[data-domain="fan"][data-state="on"],
  ha-state-icon[data-domain="humidifier"][data-state="on"],
  ha-state-icon[data-domain="light"][data-state="on"],
  ha-state-icon[data-domain="input_boolean"][data-state="on"],
  ha-state-icon[data-domain="lock"][data-state="unlocked"],
  ha-state-icon[data-domain="media_player"][data-state="on"],
  ha-state-icon[data-domain="media_player"][data-state="paused"],
  ha-state-icon[data-domain="media_player"][data-state="playing"],
  ha-state-icon[data-domain="remote"][data-state="on"],
  ha-state-icon[data-domain="script"][data-state="on"],
  ha-state-icon[data-domain="sun"][data-state="above_horizon"],
  ha-state-icon[data-domain="switch"][data-state="on"],
  ha-state-icon[data-domain="timer"][data-state="active"],
  ha-state-icon[data-domain="vacuum"][data-state="cleaning"],
  ha-state-icon[data-domain="group"][data-state="on"],
  ha-state-icon[data-domain="group"][data-state="home"],
  ha-state-icon[data-domain="group"][data-state="open"],
  ha-state-icon[data-domain="group"][data-state="locked"],
  ha-state-icon[data-domain="group"][data-state="problem"] {
    color: var(--paper-item-icon-active-color, #fdd835);
  }

  ha-state-icon[data-domain="climate"][data-state="cooling"] {
    color: var(--cool-color, var(--state-climate-cool-color));
  }

  ha-state-icon[data-domain="climate"][data-state="heating"] {
    color: var(--heat-color, var(--state-climate-heat-color));
  }

  ha-state-icon[data-domain="climate"][data-state="drying"] {
    color: var(--dry-color, var(--state-climate-dry-color));
  }

  ha-state-icon[data-domain="alarm_control_panel"] {
    color: var(--alarm-color-armed, var(--label-badge-red));
  }
  ha-state-icon[data-domain="alarm_control_panel"][data-state="disarmed"] {
    color: var(--alarm-color-disarmed, var(--label-badge-green));
  }
  ha-state-icon[data-domain="alarm_control_panel"][data-state="pending"],
  ha-state-icon[data-domain="alarm_control_panel"][data-state="arming"] {
    color: var(--alarm-color-pending, var(--label-badge-yellow));
    animation: pulse 1s infinite;
  }
  ha-state-icon[data-domain="alarm_control_panel"][data-state="triggered"] {
    color: var(--alarm-color-triggered, var(--label-badge-red));
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

  ha-state-icon[data-domain="plant"][data-state="problem"] {
    color: var(--state-icon-error-color);
  }

  /* Color the icon if unavailable */
  ha-state-icon[data-state="unavailable"] {
    color: var(--state-unavailable-color);
  }
`;
