import { ensureArray } from "../common/array/ensure-array";
import { formatNumericDuration } from "../common/datetime/format_duration";
import secondsToDuration from "../common/datetime/seconds_to_duration";
import { computeDeviceNameDisplay } from "../common/entity/compute_device_name";
import { computeStateName } from "../common/entity/compute_state_name";
import { formatListWithAnds } from "../common/string/format-list";
import { isTemplate } from "../common/string/has-template";
import type { HomeAssistant } from "../types";
import type { Condition } from "./automation";
import { describeCondition } from "./automation_i18n";
import { localizeDeviceAutomationAction } from "./device_automation";
import type { EntityRegistryEntry } from "./entity_registry";
import {
  computeEntityRegistryName,
  entityRegistryById,
} from "./entity_registry";
import type { FloorRegistryEntry } from "./floor_registry";
import { domainToName } from "./integration";
import type { LabelRegistryEntry } from "./label_registry";
import type {
  ActionType,
  ActionTypes,
  ChooseAction,
  DelayAction,
  DeviceAction,
  EventAction,
  IfAction,
  ParallelAction,
  PlayMediaAction,
  RepeatAction,
  SequenceAction,
  SetConversationResponseAction,
  StopAction,
  VariablesAction,
  WaitForTriggerAction,
} from "./script";
import { getActionType } from "./script";

const actionTranslationBaseKey =
  "ui.panel.config.automation.editor.actions.type";

export const describeAction = <T extends ActionType>(
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  labelRegistry: LabelRegistryEntry[],
  floorRegistry: Record<string, FloorRegistryEntry>,
  action: ActionTypes[T],
  actionType?: T,
  ignoreAlias = false
): string => {
  try {
    const description = tryDescribeAction(
      hass,
      entityRegistry,
      labelRegistry,
      floorRegistry,
      action,
      actionType,
      ignoreAlias
    );
    if (typeof description !== "string") {
      throw new Error(String(description));
    }
    return description;
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(error);
    let msg = "Error in describing action";
    if (error.message) {
      msg += ": " + error.message;
    }
    return msg;
  }
};

const tryDescribeAction = <T extends ActionType>(
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  labelRegistry: LabelRegistryEntry[],
  floorRegistry: Record<string, FloorRegistryEntry>,
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

    const targets: string[] = [];
    const targetOrData = config.target || config.data;
    if (typeof targetOrData === "string" && isTemplate(targetOrData)) {
      targets.push(
        hass.localize(
          `${actionTranslationBaseKey}.service.description.target_template`,
          { name: "target" }
        )
      );
    } else if (targetOrData) {
      for (const [key, name] of Object.entries({
        area_id: "areas",
        device_id: "devices",
        entity_id: "entities",
        floor_id: "floors",
        label_id: "labels",
      })) {
        if (!(key in targetOrData)) {
          continue;
        }
        const keyConf: string[] = ensureArray(targetOrData[key]) || [];

        for (const targetThing of keyConf) {
          if (isTemplate(targetThing)) {
            targets.push(
              hass.localize(
                `${actionTranslationBaseKey}.service.description.target_template`,
                { name }
              )
            );
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
              const entityReg = entityRegistryById(entityRegistry)[targetThing];
              if (entityReg) {
                targets.push(
                  computeEntityRegistryName(hass, entityReg) || targetThing
                );
              } else if (targetThing === "all") {
                targets.push(
                  hass.localize(
                    `${actionTranslationBaseKey}.service.description.target_every_entity`
                  )
                );
              } else {
                targets.push(
                  hass.localize(
                    `${actionTranslationBaseKey}.service.description.target_unknown_entity`
                  )
                );
              }
            }
          } else if (key === "device_id") {
            const device = hass.devices[targetThing];
            if (device) {
              targets.push(computeDeviceNameDisplay(device, hass));
            } else {
              targets.push(
                hass.localize(
                  `${actionTranslationBaseKey}.service.description.target_unknown_device`
                )
              );
            }
          } else if (key === "area_id") {
            const area = hass.areas[targetThing];
            if (area?.name) {
              targets.push(area.name);
            } else {
              targets.push(
                hass.localize(
                  `${actionTranslationBaseKey}.service.description.target_unknown_area`
                )
              );
            }
          } else if (key === "floor_id") {
            const floor = floorRegistry[targetThing] ?? undefined;
            if (floor?.name) {
              targets.push(floor.name);
            } else {
              targets.push(
                hass.localize(
                  `${actionTranslationBaseKey}.service.description.target_unknown_floor`
                )
              );
            }
          } else if (key === "label_id") {
            const label = labelRegistry.find(
              (lbl) => lbl.label_id === targetThing
            );
            if (label?.name) {
              targets.push(label.name);
            } else {
              targets.push(
                hass.localize(
                  `${actionTranslationBaseKey}.service.description.target_unknown_label`
                )
              );
            }
          } else {
            targets.push(targetThing);
          }
        }
      }
    }

    if (
      config.service_template ||
      (config.action && isTemplate(config.action))
    ) {
      return hass.localize(
        targets.length
          ? `${actionTranslationBaseKey}.service.description.service_based_on_template`
          : `${actionTranslationBaseKey}.service.description.service_based_on_template_no_targets`,
        {
          targets: formatListWithAnds(hass.locale, targets),
        }
      );
    }

    if (config.action) {
      const [domain, serviceName] = config.action.split(".", 2);
      const service =
        hass.localize(`component.${domain}.services.${serviceName}.name`) ||
        hass.services[domain][serviceName]?.name;

      if (config.metadata) {
        return hass.localize(
          targets.length
            ? `${actionTranslationBaseKey}.service.description.service_name`
            : `${actionTranslationBaseKey}.service.description.service_name_no_targets`,
          {
            domain: domainToName(hass.localize, domain),
            name: service || config.action,
            targets: formatListWithAnds(hass.locale, targets),
          }
        );
      }

      return hass.localize(
        targets.length
          ? `${actionTranslationBaseKey}.service.description.service_based_on_name`
          : `${actionTranslationBaseKey}.service.description.service_based_on_name_no_targets`,
        {
          name: service
            ? `${domainToName(hass.localize, domain)}: ${service}`
            : config.action,
          targets: formatListWithAnds(hass.locale, targets),
        }
      );
    }
    return hass.localize(
      `${actionTranslationBaseKey}.service.description.service`
    );
  }

  if (actionType === "delay") {
    const config = action as DelayAction;

    let duration: string;
    if (typeof config.delay === "number") {
      duration = hass.localize(
        `${actionTranslationBaseKey}.delay.description.duration_string`,
        {
          string: secondsToDuration(config.delay)!,
        }
      );
    } else if (typeof config.delay === "string") {
      duration = isTemplate(config.delay)
        ? hass.localize(
            `${actionTranslationBaseKey}.delay.description.duration_template`
          )
        : hass.localize(
            `${actionTranslationBaseKey}.delay.description.duration_string`,
            {
              string:
                config.delay ||
                hass.localize(
                  `${actionTranslationBaseKey}.delay.description.duration_unknown`
                ),
            }
          );
    } else if (config.delay) {
      duration = hass.localize(
        `${actionTranslationBaseKey}.delay.description.duration_string`,
        {
          string: formatNumericDuration(hass.locale, config.delay),
        }
      );
    } else {
      duration = hass.localize(
        `${actionTranslationBaseKey}.delay.description.duration_string`,
        {
          string: hass.localize(
            `${actionTranslationBaseKey}.delay.description.duration_unknown`
          ),
        }
      );
    }

    return hass.localize(`${actionTranslationBaseKey}.delay.description.full`, {
      duration: duration,
    });
  }

  if (actionType === "play_media") {
    const config = action as PlayMediaAction;
    const entityId = config.target?.entity_id || config.entity_id;
    const mediaStateObj = entityId ? hass.states[entityId] : undefined;
    return hass.localize(
      `${actionTranslationBaseKey}.play_media.description.full`,
      {
        hasMedia:
          config.metadata.title || config.data.media_content_id
            ? "true"
            : "false",
        media:
          (config.metadata.title as string | undefined) ||
          config.data.media_content_id,
        hasMediaPlayer:
          mediaStateObj || entityId !== undefined ? "true" : "false",
        mediaPlayer: mediaStateObj ? computeStateName(mediaStateObj) : entityId,
      }
    );
  }

  if (actionType === "wait_for_trigger") {
    const config = action as WaitForTriggerAction;
    const triggers = ensureArray(config.wait_for_trigger);
    if (!triggers || triggers.length === 0) {
      return hass.localize(
        `${actionTranslationBaseKey}.wait_for_trigger.description.wait_for_a_trigger`
      );
    }
    return hass.localize(
      `${actionTranslationBaseKey}.wait_for_trigger.description.wait_for_triggers`,
      { count: triggers.length }
    );
  }

  if (actionType === "variables") {
    const config = action as VariablesAction;
    return hass.localize(
      `${actionTranslationBaseKey}.variables.description.full`,
      {
        names: formatListWithAnds(hass.locale, Object.keys(config.variables)),
      }
    );
  }

  if (actionType === "fire_event") {
    const config = action as EventAction;
    if (isTemplate(config.event)) {
      return hass.localize(
        `${actionTranslationBaseKey}.event.description.full`,
        {
          name: hass.localize(
            `${actionTranslationBaseKey}.event.description.template`
          ),
        }
      );
    }
    return hass.localize(`${actionTranslationBaseKey}.event.description.full`, {
      name: config.event,
    });
  }

  if (actionType === "wait_template") {
    return hass.localize(
      `${actionTranslationBaseKey}.wait_template.description.full`
    );
  }

  if (actionType === "stop") {
    const config = action as StopAction;
    return hass.localize(`${actionTranslationBaseKey}.stop.description.full`, {
      hasReason: config.stop !== undefined ? "true" : "false",
      reason: config.stop,
    });
  }

  if (actionType === "if") {
    const config = action as IfAction;

    if (config.else !== undefined) {
      return hass.localize(
        `${actionTranslationBaseKey}.if.description.if_else`
      );
    }

    return hass.localize(`${actionTranslationBaseKey}.if.description.if`);
  }

  if (actionType === "choose") {
    const config = action as ChooseAction;
    if (config.choose) {
      const numActions =
        ensureArray(config.choose).length + (config.default ? 1 : 0);
      return hass.localize(
        `${actionTranslationBaseKey}.choose.description.full`,
        { number: numActions }
      );
    }
    return hass.localize(
      `${actionTranslationBaseKey}.choose.description.no_action`
    );
  }

  if (actionType === "repeat") {
    const config = action as RepeatAction;

    let chosenAction = "";
    if ("count" in config.repeat) {
      const count = config.repeat.count;
      chosenAction = hass.localize(
        `${actionTranslationBaseKey}.repeat.description.count`,
        { count: count }
      );
    } else if ("while" in config.repeat) {
      const conditions = ensureArray(config.repeat.while);
      chosenAction = hass.localize(
        `${actionTranslationBaseKey}.repeat.description.while_count`,
        { count: conditions.length }
      );
    } else if ("until" in config.repeat) {
      const conditions = ensureArray(config.repeat.until);
      chosenAction = hass.localize(
        `${actionTranslationBaseKey}.repeat.description.until_count`,
        { count: conditions.length }
      );
    } else if ("for_each" in config.repeat) {
      const items = ensureArray(config.repeat.for_each).map((item) =>
        JSON.stringify(item)
      );
      chosenAction = hass.localize(
        `${actionTranslationBaseKey}.repeat.description.for_each`,
        { items: formatListWithAnds(hass.locale, items) }
      );
    }
    return hass.localize(
      `${actionTranslationBaseKey}.repeat.description.full`,
      { chosenAction: chosenAction }
    );
  }

  if (actionType === "check_condition") {
    return hass.localize(
      `${actionTranslationBaseKey}.check_condition.description.full`,
      {
        condition: describeCondition(action as Condition, hass, entityRegistry),
      }
    );
  }

  if (actionType === "device_action") {
    const config = action as DeviceAction;
    if (!config.device_id) {
      return hass.localize(
        `${actionTranslationBaseKey}.device_id.description.no_device`
      );
    }
    const localized = localizeDeviceAutomationAction(
      hass,
      entityRegistry,
      config
    );
    if (localized) {
      return localized;
    }
    const stateObj = hass.states[config.entity_id];
    if (config.type) {
      return `${config.type} ${
        stateObj ? computeStateName(stateObj) : config.entity_id
      }`;
    }
    return hass.localize(
      `${actionTranslationBaseKey}.device_id.description.perform_device_action`,
      {
        device: stateObj ? computeStateName(stateObj) : config.entity_id,
      }
    );
  }

  if (actionType === "sequence") {
    const config = action as SequenceAction;
    const numActions = ensureArray(config.sequence).length;
    return hass.localize(
      `${actionTranslationBaseKey}.sequence.description.full`,
      { number: numActions }
    );
  }

  if (actionType === "parallel") {
    const config = action as ParallelAction;
    const numActions = ensureArray(config.parallel).length;
    return hass.localize(
      `${actionTranslationBaseKey}.parallel.description.full`,
      { number: numActions }
    );
  }

  if (actionType === "set_conversation_response") {
    const config = action as SetConversationResponseAction;
    if (isTemplate(config.set_conversation_response)) {
      return hass.localize(
        `${actionTranslationBaseKey}.set_conversation_response.description.template`
      );
    }
    return hass.localize(
      `${actionTranslationBaseKey}.set_conversation_response.description.full`,
      { response: config.set_conversation_response }
    );
  }

  return actionType;
};
