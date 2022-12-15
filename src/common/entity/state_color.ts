/** Return an color representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE } from "../../data/entity";
import { batteryStateColorProperty } from "./color/battery_color";
import { computeDomain } from "./compute_domain";
import { stateActive } from "./state_active";

const generateCssVariable = (properties: string[]): string =>
  properties
    .reverse()
    .reduce<string>(
      (str, variable) => `var(${variable}${str ? `, ${str}` : ""})`,
      ""
    );

const DEVICE_CLASSES_COLORED_DOMAIN = new Set(["binary_sensor"]);

const STATE_COLORED_DOMAIN = new Set([
  "alert",
  "lock",
  "alarm_control_panel",
  "device_tracker",
  "person",
  "climate",
]);

const COLORED_DOMAIN = new Set([
  ...DEVICE_CLASSES_COLORED_DOMAIN,
  ...STATE_COLORED_DOMAIN,
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

  const variables: string[] = [];
  const dc = stateObj.attributes.device_class;
  const active = stateActive(stateObj, stateOverride);

  const dcColored = DEVICE_CLASSES_COLORED_DOMAIN.has(domain);
  const stateColored = STATE_COLORED_DOMAIN.has(domain);

  if (dc && dcColored && active) {
    variables.push(`--state-${domain}-${dc}-${state}-color`);
    if (active) {
      variables.push(`--state-${domain}-${dc}-color`);
    }
  }

  if (stateColored) {
    variables.push(`--state-${domain}-${state}-color`);
  }
  if (active) {
    variables.push(`--state-${domain}-color`);
  }

  if (active) {
    variables.push(`--state-active-color`);
  } else {
    variables.push(`--state-inactive-color`);
  }

  return variables;
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
    return property ? [property] : undefined;
  }

  if (COLORED_DOMAIN.has(domain)) {
    const properties = domainStateColorProperties(stateObj, state);
    return properties.length > 0 ? properties : undefined;
  }

  return undefined;
};
