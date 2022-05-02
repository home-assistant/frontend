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
  ChooseAction,
  DelayAction,
  DeviceAction,
  EventAction,
  getActionType,
  IfAction,
  ParallelAction,
  PlayMediaAction,
  RepeatAction,
  SceneAction,
  StopAction,
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
    let entityId: string | undefined;
    if ("scene" in config) {
      entityId = config.scene;
    } else {
      entityId = config.target?.entity_id || config.entity_id;
    }
    const sceneStateObj = entityId ? hass.states[entityId] : undefined;
    return `Activate scene ${
      sceneStateObj
        ? computeStateName(sceneStateObj)
        : "scene" in config
        ? config.scene
        : config.target?.entity_id || config.entity_id
    }`;
  }

  if (actionType === "play_media") {
    const config = action as PlayMediaAction;
    const entityId = config.target?.entity_id || config.entity_id;
    const mediaStateObj = entityId ? hass.states[entityId] : undefined;
    return `Play ${config.metadata.title || config.data.media_content_id} on ${
      mediaStateObj
        ? computeStateName(mediaStateObj)
        : config.target?.entity_id || config.entity_id
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

  if (actionType === "stop") {
    const config = action as StopAction;
    return `Stopped${config.stop ? ` because: ${config.stop}` : ""}`;
  }

  if (actionType === "if") {
    const config = action as IfAction;
    return `If ${
      typeof config.if === "string"
        ? config.if
        : ensureArray(config.if)
            .map((condition) => describeCondition(condition))
            .join(", ")
    } then ${ensureArray(config.then).map((thenAction) =>
      describeAction(hass, thenAction)
    )}${
      config.else
        ? ` else ${ensureArray(config.else).map((elseAction) =>
            describeAction(hass, elseAction)
          )}`
        : ""
    }`;
  }

  if (actionType === "choose") {
    const config = action as ChooseAction;
    return config.choose
      ? `If ${ensureArray(config.choose)
          .map(
            (chooseAction) =>
              `${
                typeof chooseAction.conditions === "string"
                  ? chooseAction.conditions
                  : ensureArray(chooseAction.conditions)
                      .map((condition) => describeCondition(condition))
                      .join(", ")
              } then ${ensureArray(chooseAction.sequence)
                .map((chooseSeq) => describeAction(hass, chooseSeq))
                .join(", ")}`
          )
          .join(", else if ")}${
          config.default
            ? `. If none match: ${ensureArray(config.default)
                .map((dAction) => describeAction(hass, dAction))
                .join(", ")}`
            : ""
        }`
      : "Choose";
  }

  if (actionType === "repeat") {
    const config = action as RepeatAction;
    return `Repeat ${ensureArray(config.repeat.sequence).map((repeatAction) =>
      describeAction(hass, repeatAction)
    )} ${"count" in config.repeat ? `${config.repeat.count} times` : ""}${
      "while" in config.repeat
        ? `while ${ensureArray(config.repeat.while)
            .map((condition) => describeCondition(condition))
            .join(", ")} is true`
        : "until" in config.repeat
        ? `until ${ensureArray(config.repeat.until)
            .map((condition) => describeCondition(condition))
            .join(", ")} is true`
        : "for_each" in config.repeat
        ? `for every item: ${ensureArray(config.repeat.for_each)
            .map((item) => JSON.stringify(item))
            .join(", ")}`
        : ""
    }`;
  }

  if (actionType === "check_condition") {
    return `Test ${describeCondition(action as Condition)}`;
  }

  if (actionType === "device_action") {
    const config = action as DeviceAction;
    const stateObj = hass.states[config.entity_id as string];
    return `${config.type || "Perform action with"} ${
      stateObj ? computeStateName(stateObj) : config.entity_id
    }`;
  }

  if (actionType === "parallel") {
    const config = action as ParallelAction;
    return `Run in parallel: ${ensureArray(config.parallel)
      .map((pAction) => describeAction(hass, pAction))
      .join(", ")}`;
  }

  return actionType;
};
