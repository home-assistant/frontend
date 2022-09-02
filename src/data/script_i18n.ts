import { formatDuration } from "../common/datetime/format_duration";
import secondsToDuration from "../common/datetime/seconds_to_duration";
import { ensureArray } from "../common/ensure-array";
import { computeStateName } from "../common/entity/compute_state_name";
import { isTemplate } from "../common/string/has-template";
import { HomeAssistant } from "../types";
import { Condition } from "./automation";
import { describeCondition, describeTrigger } from "./automation_i18n";
import { localizeDeviceAutomationAction } from "./device_automation";
import { computeDeviceName } from "./device_registry";
import {
  computeEntityRegistryName,
  entityRegistryById,
} from "./entity_registry";
import { domainToName } from "./integration";
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
  actionType?: T,
  ignoreAlias = false
): string => {
  if (action.alias && !ignoreAlias) {
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
      const [domain, serviceName] = config.service.split(".", 2);
      const service = hass.services[domain][serviceName];
      base = service
        ? `${domainToName(hass.localize, domain)}: ${service.name}`
        : `Call service: ${config.service}`;
    } else {
      return "Call a service";
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

        for (const targetThing of keyConf) {
          if (isTemplate(targetThing)) {
            targets.push(`templated ${label}`);
            break;
          } else if (key === "entity_id") {
            if (targetThing.includes(".")) {
              const state = hass.states[targetThing];
              if (state) {
                targets.push(computeStateName(state));
              } else {
                targets.push(targetThing);
              }
            } else {
              const entityReg = entityRegistryById(hass.entities)[targetThing];
              if (entityReg) {
                targets.push(
                  computeEntityRegistryName(hass, entityReg) || targetThing
                );
              } else {
                targets.push("unknown entity");
              }
            }
          } else if (key === "device_id") {
            const device = hass.devices[targetThing];
            if (device) {
              targets.push(computeDeviceName(device, hass));
            } else {
              targets.push("unknown device");
            }
          } else if (key === "area_id") {
            const area = hass.areas[targetThing];
            if (area?.name) {
              targets.push(area.name);
            } else {
              targets.push("unknown area");
            }
          } else {
            targets.push(targetThing);
          }
        }
      }
      if (targets.length > 0) {
        base += ` ${targets.join(", ")}`;
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
        : `for ${config.delay || "a duration"}`;
    } else if (config.delay) {
      duration = `for ${formatDuration(config.delay)}`;
    } else {
      duration = "for a duration";
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
    if (!entityId) {
      return "Activate a scene";
    }
    const sceneStateObj = entityId ? hass.states[entityId] : undefined;
    return `Active scene ${
      sceneStateObj ? computeStateName(sceneStateObj) : entityId
    }`;
  }

  if (actionType === "play_media") {
    const config = action as PlayMediaAction;
    const entityId = config.target?.entity_id || config.entity_id;
    const mediaStateObj = entityId ? hass.states[entityId] : undefined;
    return `Play ${
      config.metadata.title || config.data.media_content_id || "media"
    } on ${
      mediaStateObj
        ? computeStateName(mediaStateObj)
        : entityId || "a media player"
    }`;
  }

  if (actionType === "wait_for_trigger") {
    const config = action as WaitForTriggerAction;
    const triggers = ensureArray(config.wait_for_trigger);
    if (!triggers || triggers.length === 0) {
      return "Wait for a trigger";
    }
    return `Wait for ${triggers
      .map((trigger) => describeTrigger(trigger, hass))
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
    return describeCondition(action as Condition, hass);
  }

  if (actionType === "stop") {
    const config = action as StopAction;
    return `Stop${config.stop ? ` because: ${config.stop}` : ""}`;
  }

  if (actionType === "if") {
    const config = action as IfAction;
    return `Perform an action if: ${
      !config.if
        ? ""
        : typeof config.if === "string"
        ? config.if
        : ensureArray(config.if).length > 1
        ? `${ensureArray(config.if).length} conditions`
        : ensureArray(config.if).length
        ? describeCondition(ensureArray(config.if)[0], hass)
        : ""
    }${config.else ? " (or else!)" : ""}`;
  }

  if (actionType === "choose") {
    const config = action as ChooseAction;
    return config.choose
      ? `Choose between ${
          ensureArray(config.choose).length + (config.default ? 1 : 0)
        } actions`
      : "Choose an action";
  }

  if (actionType === "repeat") {
    const config = action as RepeatAction;
    return `Repeat an action ${
      "count" in config.repeat ? `${config.repeat.count} times` : ""
    }${
      "while" in config.repeat
        ? `while ${ensureArray(config.repeat.while)
            .map((condition) => describeCondition(condition, hass))
            .join(", ")} is true`
        : "until" in config.repeat
        ? `until ${ensureArray(config.repeat.until)
            .map((condition) => describeCondition(condition, hass))
            .join(", ")} is true`
        : "for_each" in config.repeat
        ? `for every item: ${ensureArray(config.repeat.for_each)
            .map((item) => JSON.stringify(item))
            .join(", ")}`
        : ""
    }`;
  }

  if (actionType === "check_condition") {
    return `Test ${describeCondition(action as Condition, hass)}`;
  }

  if (actionType === "device_action") {
    const config = action as DeviceAction;
    if (!config.device_id) {
      return "Device action";
    }
    const localized = localizeDeviceAutomationAction(hass, config);
    if (localized) {
      return localized;
    }
    const stateObj = hass.states[config.entity_id as string];
    return `${config.type || "Perform action with"} ${
      stateObj ? computeStateName(stateObj) : config.entity_id
    }`;
  }

  if (actionType === "parallel") {
    const config = action as ParallelAction;
    return `Run  ${ensureArray(config.parallel).length} actions in parallel`;
  }

  return actionType;
};
