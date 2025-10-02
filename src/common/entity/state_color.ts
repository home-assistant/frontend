/** Return a color representing a state. */
import type { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE } from "../../data/entity";
import type { GroupEntity } from "../../data/group";
import { computeGroupDomain } from "../../data/group";
import { computeCssVariable } from "../../resources/css-variables";
import { slugify } from "../string/slugify";
import { batteryStateColorProperty } from "./color/battery_color";
import { computeDomain } from "./compute_domain";
import { stateActive } from "./state_active";

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
  "weather",
]);

export const stateColorCss = (stateObj: HassEntity, state?: string) => {
  const compareState = state !== undefined ? state : stateObj?.state;
  if (compareState === UNAVAILABLE) {
    return `var(--state-unavailable-color)`;
  }

  const properties = stateColorProperties(stateObj, state);
  if (properties) {
    return computeCssVariable(properties);
  }

  return undefined;
};

export const domainStateColorProperties = (
  domain: string,
  stateObj: HassEntity,
  state?: string
): string[] => {
  const compareState = state !== undefined ? state : stateObj.state;
  const active = stateActive(stateObj, state);

  return domainColorProperties(
    domain,
    stateObj.attributes.device_class,
    compareState,
    active
  );
};

export const domainColorProperties = (
  domain: string,
  deviceClass: string | undefined,
  state: string,
  active: boolean
) => {
  const properties: string[] = [];

  const stateKey = slugify(state, "_");
  const activeKey = active ? "active" : "inactive";

  if (deviceClass) {
    properties.push(`--state-${domain}-${deviceClass}-${stateKey}-color`);
  }

  properties.push(
    `--state-${domain}-${stateKey}-color`,
    `--state-${domain}-${activeKey}-color`,
    `--state-${activeKey}-color`
  );

  return properties;
};

export const stateColorProperties = (
  stateObj: HassEntity,
  state?: string
): string[] | undefined => {
  const compareState = state !== undefined ? state : stateObj?.state;
  const domain = computeDomain(stateObj.entity_id);
  const dc = stateObj.attributes.device_class;

  // Special rules for battery coloring
  if (domain === "sensor" && dc === "battery") {
    const property = batteryStateColorProperty(compareState);
    if (property) {
      return [property];
    }
  }

  // Special rules for group coloring
  if (domain === "group") {
    const groupDomain = computeGroupDomain(stateObj as GroupEntity);
    if (groupDomain && STATE_COLORED_DOMAIN.has(groupDomain)) {
      return domainStateColorProperties(groupDomain, stateObj, state);
    }
  }

  if (STATE_COLORED_DOMAIN.has(domain)) {
    return domainStateColorProperties(domain, stateObj, state);
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
