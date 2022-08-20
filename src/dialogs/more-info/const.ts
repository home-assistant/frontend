import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { computeDomain } from "../../common/entity/compute_domain";
import { CONTINUOUS_DOMAINS } from "../../data/logbook";
import { HomeAssistant } from "../../types";

export const DOMAINS_NO_INFO = ["camera", "configurator"];
/**
 * Entity domains that should be editable *if* they have an id present;
 * {@see shouldShowEditIcon}.
 * */
export const EDITABLE_DOMAINS_WITH_ID = ["scene", "automation"];
/**
 * Entity Domains that should always be editable; {@see shouldShowEditIcon}.
 * */
export const EDITABLE_DOMAINS = ["script"];

/** Domains with separate more info dialog. */
export const DOMAINS_WITH_MORE_INFO = [
  "alarm_control_panel",
  "automation",
  "camera",
  "climate",
  "configurator",
  "counter",
  "cover",
  "fan",
  "group",
  "humidifier",
  "input_datetime",
  "light",
  "lock",
  "media_player",
  "person",
  "remote",
  "script",
  "scene",
  "sun",
  "timer",
  "update",
  "vacuum",
  "water_heater",
  "weather",
];

/** Domains that do not show the default more info dialog content (e.g. the attribute section)
 *  and do not have a separate more info (so not in DOMAINS_WITH_MORE_INFO). */
export const DOMAINS_HIDE_DEFAULT_MORE_INFO = [
  "input_number",
  "input_select",
  "input_text",
  "number",
  "scene",
  "update",
  "select",
];

/** Domains that should have the history hidden in the more info dialog. */
export const DOMAINS_MORE_INFO_NO_HISTORY = ["camera", "configurator"];

export const computeShowHistoryComponent = (
  hass: HomeAssistant,
  entityId: string
) =>
  isComponentLoaded(hass, "history") &&
  !DOMAINS_MORE_INFO_NO_HISTORY.includes(computeDomain(entityId));

export const computeShowLogBookComponent = (
  hass: HomeAssistant,
  entityId: string
): boolean => {
  if (!isComponentLoaded(hass, "logbook")) {
    return false;
  }

  const stateObj = hass.states[entityId];
  if (!stateObj || stateObj.attributes.unit_of_measurement) {
    return false;
  }

  const domain = computeDomain(entityId);
  if (
    CONTINUOUS_DOMAINS.includes(domain) ||
    DOMAINS_MORE_INFO_NO_HISTORY.includes(domain)
  ) {
    return false;
  }

  return true;
};
