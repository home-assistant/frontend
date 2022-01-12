import secondsToDuration from "../common/datetime/seconds_to_duration";
import { ensureArray } from "../common/ensure-array";
import { computeStateName } from "../common/entity/compute_state_name";
import { isTemplate } from "../common/string/has-template";
import { HomeAssistant } from "../types";
import { Condition } from "./automation";
import { describeCondition, describeTrigger } from "./automation_i18n";
import {
  ActionType,
  ActionTypes,
  DelayAction,
  EventAction,
  getActionType,
  SceneAction,
  VariablesAction,
  WaitForTriggerAction,
} from "./script";

export const describeAction = <T extends ActionType>(
  hass: HomeAssistant,
  action: ActionTypes[T],
  actionType?: T
): string => {
  if (action.alias) {
    return action.alias;
  }
  if (!actionType) {
    actionType = getActionType(action) as T;
  }

  if (actionType === "service") {
    const config = action as ActionTypes["service"];

    let base: string | undefined;

    if (
      config.service_template ||
      (config.service && isTemplate(config.service))
    ) {
      base = "Call a service based on a template";
    } else if (config.service) {
      base = `Call service ${config.service}`;
    } else {
      return actionType;
    }
    if (config.target) {
      const targets: string[] = [];

      for (const [key, label] of Object.entries({
        area_id: "areas",
        device_id: "devices",
        entity_id: "entities",
      })) {
        if (!(key in config.target)) {
          continue;
        }
        const keyConf: string[] = Array.isArray(config.target[key])
          ? config.target[key]
          : [config.target[key]];

        const values: string[] = [];

        let renderValues = true;

        for (const targetThing of keyConf) {
          if (isTemplate(targetThing)) {
            targets.push(`templated ${label}`);
            renderValues = false;
            break;
          } else {
            values.push(targetThing);
          }
        }

        if (renderValues) {
          targets.push(`${label} ${values.join(", ")}`);
        }
      }
      if (targets.length > 0) {
        base += ` on ${targets.join(", ")}`;
      }
    }

    return base;
  }

  if (actionType === "delay") {
    const config = action as DelayAction;

    let duration: string;

    if (typeof config.delay === "number") {
      duration = `for ${secondsToDuration(config.delay)!}`;
    } else if (typeof config.delay === "string") {
      duration = isTemplate(config.delay)
        ? "based on a template"
        : `for ${config.delay}`;
    } else {
      duration = `for ${JSON.stringify(config.delay)}`;
    }

    return `Delay ${duration}`;
  }

  if (actionType === "activate_scene") {
    const config = action as SceneAction;
    const sceneStateObj = hass.states[config.scene];
    return `Activate scene ${
      sceneStateObj ? computeStateName(sceneStateObj) : config.scene
    }`;
  }

  if (actionType === "wait_for_trigger") {
    const config = action as WaitForTriggerAction;
    return `Wait for ${ensureArray(config.wait_for_trigger)
      .map((trigger) => describeTrigger(trigger))
      .join(", ")}`;
  }

  if (actionType === "variables") {
    const config = action as VariablesAction;
    return `Define variables ${Object.keys(config.variables).join(", ")}`;
  }

  if (actionType === "fire_event") {
    const config = action as EventAction;
    if (isTemplate(config.event)) {
      return "Fire event based on a template";
    }
    return `Fire event ${config.event}`;
  }

  if (actionType === "wait_template") {
    return "Wait for a template to render true";
  }

  if (actionType === "check_condition") {
    return `Test ${describeCondition(action as Condition)}`;
  }

  return actionType;
};
