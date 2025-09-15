/** Return a color representing a state. */
import type { HassEntity } from "home-assistant-js-websocket";
import type { GroupEntity } from "../../data/group";
import { computeGroupDomain } from "../../data/group";
import { slugify } from "../string/slugify";
import { batteryStateColor } from "./color/battery_color";
import { computeDomain } from "./compute_domain";
import { domainStateActive } from "./state_active";

const STATE_COLORED_DOMAIN = new Set([
  "alarm_control_panel",
  "alert",
  "automation",
  "binary_sensor",
  "calendar",
  "camera",
  "climate",
  "cover",
  "device_tracker",
  "fan",
  "group",
  "humidifier",
  "input_boolean",
  "lawn_mower",
  "light",
  "lock",
  "media_player",
  "person",
  "plant",
  "remote",
  "schedule",
  "script",
  "siren",
  "sun",
  "switch",
  "timer",
  "update",
  "vacuum",
  "valve",
  "water_heater",
]);

export const stateColor = (
  element: HTMLElement | CSSStyleDeclaration,
  stateObj: HassEntity,
  state?: string
) => {
  const domain = computeDomain(stateObj.entity_id);
  const dc = stateObj.attributes.device_class;
  const compareState = state !== undefined ? state : stateObj.state;

  // Special rules for battery coloring
  if (domain === "sensor" && dc === "battery") {
    const property = batteryStateColor(compareState);
    if (property) {
      return property;
    }
  }

  // Special rules for group coloring
  if (domain === "group") {
    const groupDomain = computeGroupDomain(stateObj as GroupEntity);
    if (groupDomain && STATE_COLORED_DOMAIN.has(groupDomain)) {
      return domainStateColor(element, groupDomain, undefined, compareState);
    }
  }

  if (STATE_COLORED_DOMAIN.has(domain)) {
    return domainStateColor(element, domain, dc, compareState);
  }

  return undefined;
};

export const domainStateColor = (
  element: HTMLElement | CSSStyleDeclaration,
  domain: string,
  deviceClass: string | undefined,
  state: string
) => {
  const style =
    element instanceof CSSStyleDeclaration
      ? element
      : getComputedStyle(element);

  const stateKey = slugify(state, "_");

  const active = domainStateActive(domain, state);
  const activeKey = active ? "active" : "inactive";

  const variables = [
    `--state-${domain}-${stateKey}-color`,
    `--state-${domain}-${activeKey}-color`,
    `--state-${activeKey}-color`,
  ];

  if (deviceClass) {
    variables.unshift(`--state-${domain}-${deviceClass}-${stateKey}-color`);
  }

  for (const variable of variables) {
    const value = style.getPropertyValue(variable).trim();
    if (value) {
      return value;
    }
  }
  return undefined;
};

export const stateColorBrightness = (stateObj: HassEntity): string => {
  if (
    stateObj.attributes.brightness &&
    computeDomain(stateObj.entity_id) !== "plant"
  ) {
    // lowest brightness will be around 50% (that's pretty dark)
    const brightness = stateObj.attributes.brightness;
    return `brightness(${(brightness + 245) / 5}%)`;
  }
  return "";
};
