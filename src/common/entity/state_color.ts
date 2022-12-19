/** Return an color representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE } from "../../data/entity";
import { batteryStateColorProperty } from "./color/battery_color";
import { personStateColorProperty } from "./color/person_color";
import { computeDomain } from "./compute_domain";
import { stateActive } from "./state_active";

const generateCssVariable = (properties: string[]): string =>
  properties
    .reverse()
    .reduce<string>(
      (str, variable) => `var(${variable}${str ? `, ${str}` : ""})`,
      ""
    );

const STATE_COLORED_DOMAIN = new Set([
  "alert",
  "lock",
  "alarm_control_panel",
  "climate",
  "sun",
]);

const DEVICE_CLASSES_COLORED_DOMAIN = new Set(["binary_sensor"]);

const COLORED_DOMAIN = new Set([
  ...STATE_COLORED_DOMAIN,
  ...DEVICE_CLASSES_COLORED_DOMAIN,
  ...[
    "automation",
    "calendar",
    "camera",
    "cover",
    "fan",
    "group",
    "humidifier",
    "input_boolean",
    "light",
    "media_player",
    "remote",
    "script",
    "schedule",
    "siren",
    "switch",
    "timer",
    "vacuum",
    "update",
  ],
]);

export const stateColorCss = (stateObj: HassEntity, state?: string) => {
  const compareState = state !== undefined ? state : stateObj?.state;
  if (compareState === UNAVAILABLE) {
    return `var(--state-unavailable-color)`;
  }

  const properties = stateColorProperties(stateObj, state);
  if (properties) {
    return generateCssVariable(properties);
  }

  return undefined;
};

export const domainStateColorProperties = (
  stateObj: HassEntity,
  stateOverride?: string
): string[] => {
  const state = stateOverride !== undefined ? stateOverride : stateObj.state;
  const domain = computeDomain(stateObj.entity_id);
  const active = stateActive(stateObj, stateOverride);

  const properties: string[] = [];

  const stateColored = STATE_COLORED_DOMAIN.has(domain);

  if (stateColored) {
    properties.push(`--state-${domain}-${state}-color`);
  }

  const dcColored = DEVICE_CLASSES_COLORED_DOMAIN.has(domain);
  const dc = stateObj.attributes.device_class;
  if (dc && dcColored && active) {
    properties.push(`--state-${domain}-${dc}-color`);
  }

  if (active) {
    properties.push(`--state-${domain}-color`);
    properties.push(`--state-active-color`);
  } else {
    properties.push(`--state-inactive-color`);
  }

  return properties;
};

export const stateColorProperties = (
  stateObj: HassEntity,
  state?: string
): string[] | undefined => {
  const compareState = state !== undefined ? state : stateObj?.state;
  const domain = computeDomain(stateObj.entity_id);
  const dc = stateObj.attributes.device_class;

  if (domain === "sensor" && dc === "battery") {
    const property = batteryStateColorProperty(compareState);
    return [property];
  }

  if (domain === "device_tracker" || domain === "person") {
    const property = personStateColorProperty(domain, compareState);
    return [property];
  }

  if (COLORED_DOMAIN.has(domain)) {
    const properties = domainStateColorProperties(stateObj, state);
    return properties.length > 0 ? properties : undefined;
  }

  return undefined;
};
