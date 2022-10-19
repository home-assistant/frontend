import { HassEntity } from "home-assistant-js-websocket";

export const DOMAIN_COLOR = [
  "alarm-armed",
  "alarm-pending",
  "alarm-triggered",
  "alarm-disarmed",
  "lock-locked",
  "lock-unlocked",
  "lock-jammed",
  "lock-pending",
  "light-on",
  "light-off",
] as const;

export type DomainColor = typeof DOMAIN_COLOR[number];

export const computeCssDomainColor = (color: DomainColor) =>
  `--rgb-state-${color}-color`;

export const domainColor = (
  domain: string,
  stateObj?: HassEntity
): DomainColor | undefined => {
  const state = stateObj?.state;

  switch (domain) {
    case "alarm_control_panel":
      switch (state) {
        case "armed_away":
        case "armed_vacation":
        case "armed_home":
        case "armed_night":
        case "armed_custom_bypass":
          return "alarm-armed";
        case "pending":
          return "alarm-pending";
        case "triggered":
          return "alarm-triggered";
        case "disarmed":
          return "alarm-disarmed";
        default:
          return undefined;
      }

    case "lock":
      switch (state) {
        case "locked":
          return "lock-locked";
        case "unlocked":
          return "lock-unlocked";
        case "jammed":
          return "lock-jammed";
        case "locking":
        case "unlocking":
          return "lock-pending";
        default:
          return undefined;
      }

    case "light":
      return state === "on" ? "light-on" : "light-off";

    // TODO implements all domains and device classes
  }
  return undefined;
};
