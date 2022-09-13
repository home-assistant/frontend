import { formatDuration } from "../common/datetime/format_duration";
import secondsToDuration from "../common/datetime/seconds_to_duration";
import { ensureArray } from "../common/ensure-array";
import { computeStateName } from "../common/entity/compute_state_name";
import type { HomeAssistant } from "../types";
import { Condition, Trigger } from "./automation";
import {
  DeviceCondition,
  DeviceTrigger,
  localizeDeviceAutomationCondition,
  localizeDeviceAutomationTrigger,
} from "./device_automation";
import { formatAttributeName } from "./entity_attributes";

export const describeTrigger = (
  trigger: Trigger,
  hass: HomeAssistant,
  ignoreAlias = false
) => {
  if (trigger.alias && !ignoreAlias) {
    return trigger.alias;
  }

  // Event Trigger
  if (trigger.platform === "event" && trigger.event_type) {
    let eventTypes = "";

    if (Array.isArray(trigger.event_type)) {
      for (const [index, state] of trigger.event_type.entries()) {
        eventTypes += `${index > 0 ? "," : ""} ${
          trigger.event_type.length > 1 &&
          index === trigger.event_type.length - 1
            ? "or"
            : ""
        } ${state}`;
      }
    } else {
      eventTypes = trigger.event_type.toString();
    }

    return `When ${eventTypes} event is fired`;
  }

  // Home Assistant Trigger
  if (trigger.platform === "homeassistant" && trigger.event) {
    return `When Home Assistant is ${
      trigger.event === "start" ? "started" : "shutdown"
    }`;
  }

  // Numeric State Trigger
  if (trigger.platform === "numeric_state" && trigger.entity_id) {
    let base = "When";
    const stateObj = hass.states[trigger.entity_id];
    const entity = stateObj ? computeStateName(stateObj) : trigger.entity_id;

    if (trigger.attribute) {
      base += ` ${formatAttributeName(trigger.attribute)} from`;
    }

    base += ` ${entity} is`;

    if ("above" in trigger) {
      base += ` above ${trigger.above}`;
    }

    if ("below" in trigger && "above" in trigger) {
      base += " and";
    }

    if ("below" in trigger) {
      base += ` below ${trigger.below}`;
    }

    return base;
  }

  // State Trigger
  if (trigger.platform === "state") {
    let base = "When";
    let entities = "";

    const states = hass.states;

    if (trigger.attribute) {
      base += ` ${formatAttributeName(trigger.attribute)} from`;
    }

    if (Array.isArray(trigger.entity_id)) {
      for (const [index, entity] of trigger.entity_id.entries()) {
        if (states[entity]) {
          entities += `${index > 0 ? "," : ""} ${
            trigger.entity_id.length > 1 &&
            index === trigger.entity_id.length - 1
              ? "or"
              : ""
          } ${computeStateName(states[entity]) || entity}`;
        }
      }
    } else if (trigger.entity_id) {
      entities = states[trigger.entity_id]
        ? computeStateName(states[trigger.entity_id])
        : trigger.entity_id;
    }

    if (!entities) {
      // no entity_id or empty array
      entities = "something";
    }

    base += ` ${entities} changes`;

    if (trigger.from) {
      let from = "";
      if (Array.isArray(trigger.from)) {
        for (const [index, state] of trigger.from.entries()) {
          from += `${index > 0 ? "," : ""} ${
            trigger.from.length > 1 && index === trigger.from.length - 1
              ? "or"
              : ""
          } ${state}`;
        }
      } else {
        from = trigger.from.toString();
      }
      base += ` from ${from}`;
    }

    if (trigger.to) {
      let to = "";
      if (Array.isArray(trigger.to)) {
        for (const [index, state] of trigger.to.entries()) {
          to += `${index > 0 ? "," : ""} ${
            trigger.to.length > 1 && index === trigger.to.length - 1 ? "or" : ""
          } ${state}`;
        }
      } else if (trigger.to) {
        to = trigger.to.toString();
      }

      base += ` to ${to}`;
    }

    if (trigger.for) {
      let duration: string | null;
      if (typeof trigger.for === "number") {
        duration = secondsToDuration(trigger.for);
      } else if (typeof trigger.for === "string") {
        duration = trigger.for;
      } else {
        duration = formatDuration(trigger.for);
      }

      if (duration) {
        base += ` for ${duration}`;
      }
    }

    return base;
  }

  // Sun Trigger
  if (trigger.platform === "sun" && trigger.event) {
    let base = `When the sun ${trigger.event === "sunset" ? "sets" : "rises"}`;

    if (trigger.offset) {
      let duration = "";

      if (trigger.offset) {
        if (typeof trigger.offset === "number") {
          duration = ` offset by ${secondsToDuration(trigger.offset)!}`;
        } else if (typeof trigger.offset === "string") {
          duration = ` offset by ${trigger.offset}`;
        } else {
          duration = ` offset by ${JSON.stringify(trigger.offset)}`;
        }
      }
      base += duration;
    }

    return base;
  }

  // Tag Trigger
  if (trigger.platform === "tag") {
    return "When a tag is scanned";
  }

  // Time Trigger
  if (trigger.platform === "time" && trigger.at) {
    const at = trigger.at.includes(".")
      ? hass.states[trigger.at] || trigger.at
      : trigger.at;

    return `When the time is equal to ${at}`;
  }

  // Time Patter Trigger
  if (trigger.platform === "time_pattern") {
    return "Time pattern trigger";
  }

  // Zone Trigger
  if (trigger.platform === "zone" && trigger.entity_id && trigger.zone) {
    let entities = "";
    let zones = "";
    let zonesPlural = false;

    const states = hass.states;

    if (Array.isArray(trigger.entity_id)) {
      for (const [index, entity] of trigger.entity_id.entries()) {
        if (states[entity]) {
          entities += `${index > 0 ? "," : ""} ${
            trigger.entity_id.length > 1 &&
            index === trigger.entity_id.length - 1
              ? "or"
              : ""
          } ${computeStateName(states[entity]) || entity}`;
        }
      }
    } else {
      entities = states[trigger.entity_id]
        ? computeStateName(states[trigger.entity_id])
        : trigger.entity_id;
    }

    if (Array.isArray(trigger.zone)) {
      if (trigger.zone.length > 1) {
        zonesPlural = true;
      }

      for (const [index, zone] of trigger.zone.entries()) {
        if (states[zone]) {
          zones += `${index > 0 ? "," : ""} ${
            trigger.zone.length > 1 && index === trigger.zone.length - 1
              ? "or"
              : ""
          } ${computeStateName(states[zone]) || zone}`;
        }
      }
    } else {
      zones = states[trigger.zone]
        ? computeStateName(states[trigger.zone])
        : trigger.zone;
    }

    return `When ${entities} ${trigger.event}s ${zones} ${
      zonesPlural ? "zones" : "zone"
    }`;
  }

  // Geo Location Trigger
  if (trigger.platform === "geo_location" && trigger.source && trigger.zone) {
    let sources = "";
    let zones = "";
    let zonesPlural = false;
    const states = hass.states;

    if (Array.isArray(trigger.source)) {
      for (const [index, source] of trigger.source.entries()) {
        sources += `${index > 0 ? "," : ""} ${
          trigger.source.length > 1 && index === trigger.source.length - 1
            ? "or"
            : ""
        } ${source}`;
      }
    } else {
      sources = trigger.source;
    }

    if (Array.isArray(trigger.zone)) {
      if (trigger.zone.length > 1) {
        zonesPlural = true;
      }

      for (const [index, zone] of trigger.zone.entries()) {
        if (states[zone]) {
          zones += `${index > 0 ? "," : ""} ${
            trigger.zone.length > 1 && index === trigger.zone.length - 1
              ? "or"
              : ""
          } ${computeStateName(states[zone]) || zone}`;
        }
      }
    } else {
      zones = states[trigger.zone]
        ? computeStateName(states[trigger.zone])
        : trigger.zone;
    }

    return `When ${sources} ${trigger.event}s ${zones} ${
      zonesPlural ? "zones" : "zone"
    }`;
  }
  // MQTT Trigger
  if (trigger.platform === "mqtt") {
    return "When an MQTT message has been received";
  }

  // Template Trigger
  if (trigger.platform === "template") {
    return "When a template triggers";
  }

  // Webhook Trigger
  if (trigger.platform === "webhook") {
    return "When a Webhook payload has been received";
  }

  if (trigger.platform === "device") {
    if (!trigger.device_id) {
      return "Device trigger";
    }
    const config = trigger as DeviceTrigger;
    const localized = localizeDeviceAutomationTrigger(hass, config);
    if (localized) {
      return localized;
    }
    const stateObj = hass.states[config.entity_id as string];
    return `${stateObj ? computeStateName(stateObj) : config.entity_id} ${
      config.type
    }`;
  }

  return `${
    trigger.platform ? trigger.platform.replace(/_/g, " ") : "Unknown"
  } trigger`;
};

export const describeCondition = (
  condition: Condition,
  hass: HomeAssistant,
  ignoreAlias = false
) => {
  if (condition.alias && !ignoreAlias) {
    return condition.alias;
  }

  if (!condition.condition) {
    const shorthands: Array<"and" | "or" | "not"> = ["and", "or", "not"];
    for (const key of shorthands) {
      if (!(key in condition)) {
        continue;
      }
      if (ensureArray(condition[key])) {
        condition = {
          condition: key,
          conditions: condition[key],
        };
      }
    }
  }

  if (condition.condition === "or") {
    const conditions = ensureArray(condition.conditions);

    let count = "condition";

    if (conditions && conditions.length > 0) {
      count = `of ${conditions.length} conditions`;
    }

    return `Test if any ${count} matches`;
  }

  if (condition.condition === "and") {
    const conditions = ensureArray(condition.conditions);

    const count =
      conditions && conditions.length > 0
        ? `${conditions.length} `
        : "multiple";

    return `Test if ${count} conditions match`;
  }

  if (condition.condition === "not") {
    const conditions = ensureArray(condition.conditions);

    const what =
      conditions && conditions.length > 0
        ? `none of ${conditions.length} conditions match`
        : "no condition matches";

    return `Test if ${what}`;
  }

  // State Condition
  if (condition.condition === "state") {
    let base = "Confirm";
    const stateObj = hass.states[condition.entity_id];
    const entity = stateObj
      ? computeStateName(stateObj)
      : condition.entity_id
      ? condition.entity_id
      : "an entity";

    if ("attribute" in condition) {
      base += ` ${condition.attribute} from`;
    }

    let states = "";

    if (Array.isArray(condition.state)) {
      for (const [index, state] of condition.state.entries()) {
        states += `${index > 0 ? "," : ""} ${
          condition.state.length > 1 && index === condition.state.length - 1
            ? "or"
            : ""
        } ${state}`;
      }
    } else if (condition.state) {
      states = condition.state.toString();
    }

    if (!states) {
      states = "a state";
    }

    base += ` ${entity} is ${states}`;

    if ("for" in condition) {
      let duration: string;
      if (typeof condition.for === "number") {
        duration = `for ${secondsToDuration(condition.for)!}`;
      } else if (typeof condition.for === "string") {
        duration = `for ${condition.for}`;
      } else {
        duration = `for ${JSON.stringify(condition.for)}`;
      }
      base += ` for ${duration}`;
    }

    return base;
  }

  // Numeric State Condition
  if (condition.condition === "numeric_state" && condition.entity_id) {
    let base = "Confirm";
    const stateObj = hass.states[condition.entity_id];
    const entity = stateObj ? computeStateName(stateObj) : condition.entity_id;

    if ("attribute" in condition) {
      base += ` ${condition.attribute} from`;
    }

    base += ` ${entity} is`;

    if ("above" in condition) {
      base += ` above ${condition.above}`;
    }

    if ("below" in condition && "above" in condition) {
      base += " and";
    }

    if ("below" in condition) {
      base += ` below ${condition.below}`;
    }

    return base;
  }

  // Sun condition
  if (
    condition.condition === "sun" &&
    ("before" in condition || "after" in condition)
  ) {
    let base = "Confirm";

    if (!condition.after && !condition.before) {
      base += " sun";
      return base;
    }

    base += " sun";

    if (condition.after) {
      let duration = "";

      if (condition.after_offset) {
        if (typeof condition.after_offset === "number") {
          duration = ` offset by ${secondsToDuration(condition.after_offset)!}`;
        } else if (typeof condition.after_offset === "string") {
          duration = ` offset by ${condition.after_offset}`;
        } else {
          duration = ` offset by ${JSON.stringify(condition.after_offset)}`;
        }
      }

      base += ` after ${condition.after}${duration}`;
    }

    if (condition.before) {
      base += ` before ${condition.before}`;
    }

    return base;
  }

  // Zone condition
  if (condition.condition === "zone" && condition.entity_id && condition.zone) {
    let entities = "";
    let entitiesPlural = false;
    let zones = "";
    let zonesPlural = false;

    const states = hass.states;

    if (Array.isArray(condition.entity_id)) {
      if (condition.entity_id.length > 1) {
        entitiesPlural = true;
      }
      for (const [index, entity] of condition.entity_id.entries()) {
        if (states[entity]) {
          entities += `${index > 0 ? "," : ""} ${
            condition.entity_id.length > 1 &&
            index === condition.entity_id.length - 1
              ? "or"
              : ""
          } ${computeStateName(states[entity]) || entity}`;
        }
      }
    } else {
      entities = states[condition.entity_id]
        ? computeStateName(states[condition.entity_id])
        : condition.entity_id;
    }

    if (Array.isArray(condition.zone)) {
      if (condition.zone.length > 1) {
        zonesPlural = true;
      }

      for (const [index, zone] of condition.zone.entries()) {
        if (states[zone]) {
          zones += `${index > 0 ? "," : ""} ${
            condition.zone.length > 1 && index === condition.zone.length - 1
              ? "or"
              : ""
          } ${computeStateName(states[zone]) || zone}`;
        }
      }
    } else {
      zones = states[condition.zone]
        ? computeStateName(states[condition.zone])
        : condition.zone;
    }

    return `Confirm ${entities} ${entitiesPlural ? "are" : "is"} in ${zones} ${
      zonesPlural ? "zones" : "zone"
    }`;
  }

  if (condition.condition === "device") {
    if (!condition.device_id) {
      return "Device condition";
    }
    const config = condition as DeviceCondition;
    const localized = localizeDeviceAutomationCondition(hass, config);
    if (localized) {
      return localized;
    }
    const stateObj = hass.states[config.entity_id as string];
    return `${stateObj ? computeStateName(stateObj) : config.entity_id} ${
      config.type
    }`;
  }

  return `${
    condition.condition ? condition.condition.replace(/_/g, " ") : "Unknown"
  } condition`;
};
