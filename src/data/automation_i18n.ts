import secondsToDuration from "../common/datetime/seconds_to_duration";
import { computeStateName } from "../common/entity/compute_state_name";
import type { HomeAssistant } from "../types";
import { Condition, Trigger } from "./automation";

export const describeTrigger = (trigger: Trigger) => {
  if (trigger.alias) {
    return trigger.alias;
  }
  return `${trigger.platform || "Unknown"} trigger`;
};

export const describeCondition = (
  condition: Condition,
  hass: HomeAssistant
) => {
  if (condition.alias) {
    return condition.alias;
  }

  if (["or", "and", "not"].includes(condition.condition)) {
    return `multiple conditions using "${condition.condition}"`;
  }

  // State Condition
  if (condition.condition === "state" && condition.entity_id) {
    let base = "Confirm";
    const stateObj = hass.states[condition.entity_id];
    const entity = stateObj ? computeStateName(stateObj) : condition.entity_id;

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
    } else {
      states = condition.state.toString();
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

  return `${condition.condition} condition`;
};
