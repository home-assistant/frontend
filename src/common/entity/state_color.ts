/** Return an color representing a state. */
import { HassEntity } from "home-assistant-js-websocket";
import { UNAVAILABLE } from "../../data/entity";
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
  "fan",
  "group",
  "humidifier",
  "input_boolean",
  "light",
  "lock",
  "media_player",
  "remote",
  "script",
  "siren",
  "sun",
  "switch",
  "timer",
  "update",
  "vacuum",
  "device_tracker",
  "person",
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
  stateObj: HassEntity,
  state?: string
): string[] => {
  const compareState = state !== undefined ? state : stateObj.state;
  const domain = computeDomain(stateObj.entity_id);
  const active = stateActive(stateObj, state);

  const properties: string[] = [];

  const stateKey = slugify(compareState, "_");
  const activeKey = active ? "active" : "inactive";

  const dc = stateObj.attributes.device_class;

  if (dc) {
    properties.push(`--state-${domain}-${dc}-${stateKey}-color`);
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
    return [property];
  }

  if (STATE_COLORED_DOMAIN.has(domain)) {
    return domainStateColorProperties(stateObj, state);
  }

  return undefined;
};
