import { HassEntity } from "home-assistant-js-websocket";
import { alarmControlPanelColor } from "./color/alarm_control_panel_color";
import { coverColor } from "./color/cover_color";
import { lockColor } from "./color/lock_color";

export const DOMAIN_COLOR = [
  "alarm-armed",
  "alarm-disarmed",
  "alarm-pending",
  "alarm-triggered",
  "cover-off",
  "cover-on",
  "cover-secure-on",
  "humidifier-off",
  "humidifier-on",
  "light-off",
  "light-on",
  "lock-jammed",
  "lock-locked",
  "lock-pending",
  "lock-unlocked",
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
      return alarmControlPanelColor(state);

    case "cover":
      return coverColor(state, stateObj);

    case "lock":
      return lockColor(state);

    case "light":
      return state === "on" ? "light-on" : "light-off";

    case "humidifier":
      return state === "on" ? "humidifier-on" : "humidifier-off";

    // TODO implements all domains and device classes
  }
  return undefined;
};
