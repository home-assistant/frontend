import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
import {
  formatDurationLong,
  formatNumericDuration,
} from "../common/datetime/format_duration";
import {
  formatTime,
  formatTimeWithSeconds,
} from "../common/datetime/format_time";
import secondsToDuration from "../common/datetime/seconds_to_duration";
import { computeAttributeNameDisplay } from "../common/entity/compute_attribute_display";
import { computeStateName } from "../common/entity/compute_state_name";
import { isValidEntityId } from "../common/entity/valid_entity_id";
import {
  formatListWithAnds,
  formatListWithOrs,
} from "../common/string/format-list";
import type { HomeAssistant } from "../types";
import type { Condition, ForDict, Trigger } from "./automation";
import type { DeviceCondition, DeviceTrigger } from "./device_automation";
import {
  localizeDeviceAutomationCondition,
  localizeDeviceAutomationTrigger,
} from "./device_automation";
import type { EntityRegistryEntry } from "./entity_registry";
import type { FrontendLocaleData } from "./translation";
import { isTriggerList } from "./trigger";
import { hasTemplate } from "../common/string/has-template";

const triggerTranslationBaseKey =
  "ui.panel.config.automation.editor.triggers.type";
const conditionsTranslationBaseKey =
  "ui.panel.config.automation.editor.conditions.type";

const describeDuration = (
  locale: FrontendLocaleData,
  forTime: number | string | ForDict
) => {
  let duration: string | null;
  if (typeof forTime === "number") {
    duration = secondsToDuration(forTime);
  } else if (typeof forTime === "string") {
    duration = forTime;
  } else {
    duration = formatNumericDuration(locale, forTime);
  }
  return duration;
};

const localizeTimeString = (
  time: string,
  locale: FrontendLocaleData,
  config: HassConfig
) => {
  const chunks = time.split(":");
  if (chunks.length < 2 || chunks.length > 3) {
    return time;
  }
  try {
    const dt = new Date("1970-01-01T" + time);
    if (chunks.length === 2 || Number(chunks[2]) === 0) {
      return formatTime(dt, locale, config);
    }
    return formatTimeWithSeconds(dt, locale, config);
  } catch {
    return time;
  }
};

export const describeTrigger = (
  trigger: Trigger,
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  ignoreAlias = false
): string => {
  try {
    const description = tryDescribeTrigger(
      trigger,
      hass,
      entityRegistry,
      ignoreAlias
    );
    if (typeof description !== "string") {
      throw new Error(String(description));
    }
    return description;
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(error);

    let msg = "Error in describing trigger";
    if (error.message) {
      msg += ": " + error.message;
    }
    return msg;
  }
};

const tryDescribeTrigger = (
  trigger: Trigger,
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  ignoreAlias = false
) => {
  if (isTriggerList(trigger)) {
    const triggers = ensureArray(trigger.triggers);

    if (!triggers || triggers.length === 0) {
      return hass.localize(
        `${triggerTranslationBaseKey}.list.description.no_trigger`
      );
    }
    const count = triggers.length;
    return hass.localize(`${triggerTranslationBaseKey}.list.description.full`, {
      count: count,
    });
  }

  if (trigger.alias && !ignoreAlias) {
    return trigger.alias;
  }

  // Event Trigger
  if (trigger.trigger === "event" && trigger.event_type) {
    const eventTypes: string[] = [];

    if (Array.isArray(trigger.event_type)) {
      for (const state of trigger.event_type.values()) {
        eventTypes.push(state);
      }
    } else {
      eventTypes.push(trigger.event_type);
    }

    const eventTypesString = formatListWithOrs(hass.locale, eventTypes);
    return hass.localize(
      `${triggerTranslationBaseKey}.event.description.full`,
      { eventTypes: eventTypesString }
    );
  }

  // Home Assistant Trigger
  if (trigger.trigger === "homeassistant" && trigger.event) {
    return hass.localize(
      trigger.event === "start"
        ? `${triggerTranslationBaseKey}.homeassistant.description.started`
        : `${triggerTranslationBaseKey}.homeassistant.description.shutdown`
    );
  }

  // Numeric State Trigger
  if (trigger.trigger === "numeric_state" && trigger.entity_id) {
    const entities: string[] = [];
    const states = hass.states;

    const stateObj = Array.isArray(trigger.entity_id)
      ? hass.states[trigger.entity_id[0]]
      : (hass.states[trigger.entity_id] as HassEntity | undefined);

    if (Array.isArray(trigger.entity_id)) {
      for (const entity of trigger.entity_id.values()) {
        if (states[entity]) {
          entities.push(computeStateName(states[entity]) || entity);
        }
      }
    } else if (trigger.entity_id) {
      entities.push(
        states[trigger.entity_id]
          ? computeStateName(states[trigger.entity_id])
          : trigger.entity_id
      );
    }

    const attribute = trigger.attribute
      ? stateObj
        ? computeAttributeNameDisplay(
            hass.localize,
            stateObj,
            hass.entities,
            trigger.attribute
          )
        : trigger.attribute
      : undefined;

    const duration = trigger.for
      ? describeDuration(hass.locale, trigger.for)
      : undefined;

    if (trigger.above !== undefined && trigger.below !== undefined) {
      return hass.localize(
        `${triggerTranslationBaseKey}.numeric_state.description.above-below`,
        {
          attribute: attribute,
          entity: formatListWithOrs(hass.locale, entities),
          numberOfEntities: entities.length,
          above: trigger.above,
          below: trigger.below,
          duration: duration,
        }
      );
    }
    if (trigger.above !== undefined) {
      return hass.localize(
        `${triggerTranslationBaseKey}.numeric_state.description.above`,
        {
          attribute: attribute,
          entity: formatListWithOrs(hass.locale, entities),
          numberOfEntities: entities.length,
          above: trigger.above,
          duration: duration,
        }
      );
    }
    if (trigger.below !== undefined) {
      return hass.localize(
        `${triggerTranslationBaseKey}.numeric_state.description.below`,
        {
          attribute: attribute,
          entity: formatListWithOrs(hass.locale, entities),
          numberOfEntities: entities.length,
          below: trigger.below,
          duration: duration,
        }
      );
    }
  }

  // State Trigger
  if (trigger.trigger === "state") {
    const entities: string[] = [];
    const states = hass.states;

    let attribute = "";
    if (trigger.attribute) {
      const stateObj = Array.isArray(trigger.entity_id)
        ? hass.states[trigger.entity_id[0]]
        : (hass.states[trigger.entity_id] as HassEntity | undefined);
      attribute = stateObj
        ? computeAttributeNameDisplay(
            hass.localize,
            stateObj,
            hass.entities,
            trigger.attribute
          )
        : trigger.attribute;
    }

    const entityArray: string[] = ensureArray(trigger.entity_id);
    if (entityArray) {
      for (const entity of entityArray) {
        if (states[entity]) {
          entities.push(computeStateName(states[entity]) || entity);
        }
      }
    }

    const stateObj = hass.states[entityArray[0]] as HassEntity | undefined;

    let fromChoice = "other";
    let fromString = "";
    if (trigger.from !== undefined) {
      let fromArray: string[] = [];
      if (trigger.from === null) {
        if (!trigger.attribute) {
          fromChoice = "null";
        }
      } else {
        fromArray = ensureArray(trigger.from);

        const from: string[] = [];
        for (const state of fromArray) {
          from.push(
            stateObj
              ? trigger.attribute
                ? hass
                    .formatEntityAttributeValue(
                      stateObj,
                      trigger.attribute,
                      state
                    )
                    .toString()
                : hass.formatEntityState(stateObj, state)
              : state
          );
        }
        if (from.length !== 0) {
          fromString = formatListWithOrs(hass.locale, from);
          fromChoice = "fromUsed";
        }
      }
    }

    let toChoice = "other";
    let toString = "";
    if (trigger.to !== undefined) {
      let toArray: string[] = [];
      if (trigger.to === null) {
        if (!trigger.attribute) {
          toChoice = "null";
        }
      } else {
        toArray = ensureArray(trigger.to);

        const to: string[] = [];
        for (const state of toArray) {
          to.push(
            stateObj
              ? trigger.attribute
                ? hass
                    .formatEntityAttributeValue(
                      stateObj,
                      trigger.attribute,
                      state
                    )
                    .toString()
                : hass.formatEntityState(stateObj, state).toString()
              : state
          );
        }
        if (to.length !== 0) {
          toString = formatListWithOrs(hass.locale, to);
          toChoice = "toUsed";
        }
      }
    }

    if (
      !trigger.attribute &&
      trigger.from === undefined &&
      trigger.to === undefined
    ) {
      toChoice = "special";
    }

    let duration = "";
    if (trigger.for) {
      duration = describeDuration(hass.locale, trigger.for) ?? "";
    }

    return hass.localize(
      `${triggerTranslationBaseKey}.state.description.full`,
      {
        hasAttribute: attribute !== "" ? "true" : "false",
        attribute: attribute,
        hasEntity: entities.length !== 0 ? "true" : "false",
        entity: formatListWithOrs(hass.locale, entities),
        fromChoice: fromChoice,
        fromString: fromString,
        toChoice: toChoice,
        toString: toString,
        hasDuration: duration !== "" ? "true" : "false",
        duration: duration,
      }
    );
  }

  // Sun Trigger
  if (trigger.trigger === "sun" && trigger.event) {
    let duration = "";
    if (trigger.offset) {
      if (typeof trigger.offset === "number") {
        duration = secondsToDuration(trigger.offset)!;
      } else if (typeof trigger.offset === "string") {
        duration = trigger.offset;
      } else {
        duration = JSON.stringify(trigger.offset);
      }
    }

    return hass.localize(
      trigger.event === "sunset"
        ? `${triggerTranslationBaseKey}.sun.description.sets`
        : `${triggerTranslationBaseKey}.sun.description.rises`,
      { hasDuration: duration !== "" ? "true" : "false", duration: duration }
    );
  }

  // Tag Trigger
  if (trigger.trigger === "tag") {
    return hass.localize(`${triggerTranslationBaseKey}.tag.description.full`);
  }

  // Time Trigger
  if (trigger.trigger === "time" && trigger.at) {
    const result = ensureArray(trigger.at).map((at) => {
      if (typeof at === "string") {
        if (isValidEntityId(at)) {
          return `entity ${hass.states[at] ? computeStateName(hass.states[at]) : at}`;
        }
        return localizeTimeString(at, hass.locale, hass.config);
      }
      const entityStr = `entity ${hass.states[at.entity_id] ? computeStateName(hass.states[at.entity_id]) : at.entity_id}`;
      const offsetStr = at.offset
        ? " " +
          hass.localize(`${triggerTranslationBaseKey}.time.offset_by`, {
            offset: describeDuration(hass.locale, at.offset),
          })
        : "";
      return `${entityStr}${offsetStr}`;
    });

    return hass.localize(`${triggerTranslationBaseKey}.time.description.full`, {
      time: formatListWithOrs(hass.locale, result),
    });
  }

  // Time Pattern Trigger
  if (trigger.trigger === "time_pattern") {
    if (!trigger.seconds && !trigger.minutes && !trigger.hours) {
      return hass.localize(
        `${triggerTranslationBaseKey}.time_pattern.description.initial`
      );
    }

    const invalidParts: ("seconds" | "minutes" | "hours")[] = [];

    let secondsChoice: "every" | "every_interval" | "on_the_xth" | "other" =
      "other";
    let minutesChoice:
      | "every"
      | "every_interval"
      | "on_the_xth"
      | "other"
      | "has_seconds" = "other";
    let hoursChoice:
      | "every"
      | "every_interval"
      | "on_the_xth"
      | "other"
      | "has_seconds_or_minutes" = "other";

    let seconds = 0;
    let minutes = 0;
    let hours = 0;

    if (trigger.seconds !== undefined) {
      const seconds_all = trigger.seconds === "*";
      const seconds_interval =
        typeof trigger.seconds === "string" && trigger.seconds.startsWith("/");
      seconds = seconds_all
        ? 0
        : typeof trigger.seconds === "number"
          ? trigger.seconds
          : seconds_interval
            ? parseInt(trigger.seconds.substring(1))
            : parseInt(trigger.seconds);

      if (
        isNaN(seconds) ||
        seconds > 59 ||
        seconds < 0 ||
        (seconds_interval && seconds === 0)
      ) {
        invalidParts.push("seconds");
      }

      if (seconds_all || (seconds_interval && seconds === 1)) {
        secondsChoice = "every";
      } else if (seconds_interval) {
        secondsChoice = "every_interval";
      } else {
        secondsChoice = "on_the_xth";
      }
    }
    if (trigger.minutes !== undefined) {
      const minutes_all = trigger.minutes === "*";
      const minutes_interval =
        typeof trigger.minutes === "string" && trigger.minutes.startsWith("/");
      minutes = minutes_all
        ? 0
        : typeof trigger.minutes === "number"
          ? trigger.minutes
          : minutes_interval
            ? parseInt(trigger.minutes.substring(1))
            : parseInt(trigger.minutes);

      if (
        isNaN(minutes) ||
        minutes > 59 ||
        minutes < 0 ||
        (minutes_interval && minutes === 0)
      ) {
        invalidParts.push("minutes");
      }

      if (minutes_all || (minutes_interval && minutes === 1)) {
        minutesChoice = "every";
      } else if (minutes_interval) {
        minutesChoice = "every_interval";
      } else {
        minutesChoice =
          trigger.seconds !== undefined ? "has_seconds" : "on_the_xth";
      }
    } else if (trigger.seconds !== undefined) {
      if (trigger.hours !== undefined) {
        minutes = 0;
        minutesChoice = "has_seconds";
      } else {
        minutesChoice = "every";
      }
    }
    if (trigger.hours !== undefined) {
      const hours_all = trigger.hours === "*";
      const hours_interval =
        typeof trigger.hours === "string" && trigger.hours.startsWith("/");
      hours = hours_all
        ? 0
        : typeof trigger.hours === "number"
          ? trigger.hours
          : hours_interval
            ? parseInt(trigger.hours.substring(1))
            : parseInt(trigger.hours);

      if (
        isNaN(hours) ||
        hours > 23 ||
        hours < 0 ||
        (hours_interval && hours === 0)
      ) {
        invalidParts.push("hours");
      }

      if (hours_all || (hours_interval && hours === 1)) {
        hoursChoice = "every";
      } else if (hours_interval) {
        hoursChoice = "every_interval";
      } else {
        hoursChoice =
          trigger.seconds !== undefined || trigger.minutes !== undefined
            ? "has_seconds_or_minutes"
            : "on_the_xth";
      }
    } else {
      hoursChoice = "every";
    }

    if (invalidParts.length !== 0) {
      return hass.localize(
        `${triggerTranslationBaseKey}.time_pattern.description.invalid`,
        {
          parts: formatListWithAnds(
            hass.locale,
            invalidParts.map((invalidPart) =>
              hass.localize(
                `${triggerTranslationBaseKey}.time_pattern.${invalidPart}`
              )
            )
          ),
        }
      );
    }

    return hass.localize(
      `${triggerTranslationBaseKey}.time_pattern.description.full`,
      {
        secondsChoice: secondsChoice,
        minutesChoice: minutesChoice,
        hoursChoice: hoursChoice,
        seconds: seconds,
        minutes: minutes,
        hours: hours,
        secondsWithOrdinal: hass.localize(
          `${triggerTranslationBaseKey}.time_pattern.description.ordinal`,
          {
            part: seconds,
          }
        ),
        minutesWithOrdinal: hass.localize(
          `${triggerTranslationBaseKey}.time_pattern.description.ordinal`,
          {
            part: minutes,
          }
        ),
        hoursWithOrdinal: hass.localize(
          `${triggerTranslationBaseKey}.time_pattern.description.ordinal`,
          {
            part: hours,
          }
        ),
      }
    );
  }

  // Zone Trigger
  if (trigger.trigger === "zone" && trigger.entity_id && trigger.zone) {
    const entities: string[] = [];
    const zones: string[] = [];

    const states = hass.states;

    if (Array.isArray(trigger.entity_id)) {
      for (const entity of trigger.entity_id.values()) {
        if (states[entity]) {
          entities.push(computeStateName(states[entity]) || entity);
        }
      }
    } else {
      entities.push(
        states[trigger.entity_id]
          ? computeStateName(states[trigger.entity_id])
          : trigger.entity_id
      );
    }

    if (Array.isArray(trigger.zone)) {
      for (const zone of trigger.zone.values()) {
        if (states[zone]) {
          zones.push(computeStateName(states[zone]) || zone);
        }
      }
    } else {
      zones.push(
        states[trigger.zone]
          ? computeStateName(states[trigger.zone])
          : trigger.zone
      );
    }

    return hass.localize(`${triggerTranslationBaseKey}.zone.description.full`, {
      entity: formatListWithOrs(hass.locale, entities),
      event: trigger.event.toString(),
      zone: formatListWithOrs(hass.locale, zones),
      numberOfZones: zones.length,
    });
  }

  // Geo Location Trigger
  if (trigger.trigger === "geo_location" && trigger.source && trigger.zone) {
    const sources: string[] = [];
    const zones: string[] = [];
    const states = hass.states;

    if (Array.isArray(trigger.source)) {
      for (const source of trigger.source.values()) {
        sources.push(source);
      }
    } else {
      sources.push(trigger.source);
    }

    if (Array.isArray(trigger.zone)) {
      for (const zone of trigger.zone.values()) {
        if (states[zone]) {
          zones.push(computeStateName(states[zone]) || zone);
        }
      }
    } else {
      zones.push(
        states[trigger.zone]
          ? computeStateName(states[trigger.zone])
          : trigger.zone
      );
    }

    return hass.localize(
      `${triggerTranslationBaseKey}.geo_location.description.full`,
      {
        source: formatListWithOrs(hass.locale, sources),
        event: trigger.event.toString(),
        zone: formatListWithOrs(hass.locale, zones),
        numberOfZones: zones.length,
      }
    );
  }

  // MQTT Trigger
  if (trigger.trigger === "mqtt") {
    return hass.localize(`${triggerTranslationBaseKey}.mqtt.description.full`);
  }

  // Template Trigger
  if (trigger.trigger === "template") {
    let duration = "";
    if (trigger.for) {
      duration = describeDuration(hass.locale, trigger.for) ?? "";
    }

    return hass.localize(
      `${triggerTranslationBaseKey}.template.description.full`,
      { hasDuration: duration !== "" ? "true" : "false", duration: duration }
    );
  }

  // Webhook Trigger
  if (trigger.trigger === "webhook") {
    return hass.localize(
      `${triggerTranslationBaseKey}.webhook.description.full`
    );
  }

  // Conversation Trigger
  if (trigger.trigger === "conversation") {
    if (!trigger.command || !trigger.command.length) {
      return hass.localize(
        `${triggerTranslationBaseKey}.conversation.description.empty`
      );
    }

    const commands = ensureArray(trigger.command);

    if (commands.length === 1) {
      return hass.localize(
        `${triggerTranslationBaseKey}.conversation.description.single`,
        {
          sentence: commands[0],
        }
      );
    }
    return hass.localize(
      `${triggerTranslationBaseKey}.conversation.description.multiple`,
      {
        sentence: commands[0],
        count: commands.length - 1,
      }
    );
  }

  // Persistent Notification Trigger
  if (trigger.trigger === "persistent_notification") {
    return hass.localize(
      `${triggerTranslationBaseKey}.persistent_notification.description.full`
    );
  }

  // Device Trigger
  if (trigger.trigger === "device" && trigger.device_id) {
    const config = trigger as DeviceTrigger;
    const localized = localizeDeviceAutomationTrigger(
      hass,
      entityRegistry,
      config
    );
    if (localized) {
      return localized;
    }
    const stateObj = hass.states[config.entity_id as string] as
      | HassEntity
      | undefined;
    return `${stateObj ? computeStateName(stateObj) : config.entity_id} ${
      config.type
    }`;
  }

  // Calendar Trigger
  if (trigger.trigger === "calendar") {
    const calendarEntity = hass.states[trigger.entity_id]
      ? computeStateName(hass.states[trigger.entity_id])
      : trigger.entity_id;

    let offsetChoice = "other";
    let offset: string | string[] = "";
    if (trigger.offset) {
      offsetChoice = trigger.offset.startsWith("-") ? "before" : "after";
      offset = trigger.offset.startsWith("-")
        ? trigger.offset.substring(1).split(":")
        : trigger.offset.split(":");
      const duration = {
        hours: offset.length > 0 ? +offset[0] : 0,
        minutes: offset.length > 1 ? +offset[1] : 0,
        seconds: offset.length > 2 ? +offset[2] : 0,
      };
      offset = formatDurationLong(hass.locale, duration);
      if (offset === "") {
        offsetChoice = "other";
      }
    }

    return hass.localize(
      `${triggerTranslationBaseKey}.calendar.description.full`,
      {
        eventChoice: trigger.event,
        offsetChoice: offsetChoice,
        offset: offset,
        hasCalendar: trigger.entity_id ? "true" : "false",
        calendar: calendarEntity,
      }
    );
  }

  return (
    hass.localize(
      `ui.panel.config.automation.editor.triggers.type.${trigger.trigger}.label`
    ) ||
    hass.localize(`ui.panel.config.automation.editor.triggers.unknown_trigger`)
  );
};

export const describeCondition = (
  condition: Condition,
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  ignoreAlias = false
): string => {
  try {
    const description = tryDescribeCondition(
      condition,
      hass,
      entityRegistry,
      ignoreAlias
    );
    if (typeof description !== "string") {
      throw new Error(String(description));
    }
    return description;
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(error);

    let msg = "Error in describing condition";
    if (error.message) {
      msg += ": " + error.message;
    }
    return msg;
  }
};

const tryDescribeCondition = (
  condition: Condition,
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  ignoreAlias = false
) => {
  if (typeof condition === "string" && hasTemplate(condition)) {
    return hass.localize(
      `${conditionsTranslationBaseKey}.template.description.full`
    );
  }

  if (condition.alias && !ignoreAlias) {
    return condition.alias;
  }

  if (!condition.condition) {
    const shorthands: ("and" | "or" | "not")[] = ["and", "or", "not"];
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

    if (!conditions || conditions.length === 0) {
      return hass.localize(
        `${conditionsTranslationBaseKey}.or.description.no_conditions`
      );
    }
    const count = conditions.length;
    return hass.localize(
      `${conditionsTranslationBaseKey}.or.description.full`,
      {
        count: count,
      }
    );
  }

  if (condition.condition === "and") {
    const conditions = ensureArray(condition.conditions);

    if (!conditions || conditions.length === 0) {
      return hass.localize(
        `${conditionsTranslationBaseKey}.and.description.no_conditions`
      );
    }
    const count = conditions.length;
    return hass.localize(
      `${conditionsTranslationBaseKey}.and.description.full`,
      {
        count: count,
      }
    );
  }

  if (condition.condition === "not") {
    const conditions = ensureArray(condition.conditions);

    if (!conditions || conditions.length === 0) {
      return hass.localize(
        `${conditionsTranslationBaseKey}.not.description.no_conditions`
      );
    }
    if (conditions.length === 1) {
      return hass.localize(
        `${conditionsTranslationBaseKey}.not.description.one_condition`
      );
    }
    return hass.localize(
      `${conditionsTranslationBaseKey}.not.description.full`,
      { count: conditions.length }
    );
  }

  // State Condition
  if (condition.condition === "state") {
    if (!condition.entity_id) {
      return hass.localize(
        `${conditionsTranslationBaseKey}.state.description.no_entity`
      );
    }

    let attribute = "";
    if (condition.attribute) {
      const stateObj = Array.isArray(condition.entity_id)
        ? hass.states[condition.entity_id[0]]
        : (hass.states[condition.entity_id] as HassEntity | undefined);
      attribute = stateObj
        ? computeAttributeNameDisplay(
            hass.localize,
            stateObj,
            hass.entities,
            condition.attribute
          )
        : condition.attribute;
    }

    const entities: string[] = [];
    if (Array.isArray(condition.entity_id)) {
      for (const entity of condition.entity_id.values()) {
        if (hass.states[entity]) {
          entities.push(computeStateName(hass.states[entity]) || entity);
        }
      }
    } else if (condition.entity_id) {
      entities.push(
        hass.states[condition.entity_id]
          ? computeStateName(hass.states[condition.entity_id])
          : condition.entity_id
      );
    }

    const states: string[] = [];
    const stateObj = hass.states[
      Array.isArray(condition.entity_id)
        ? condition.entity_id[0]
        : condition.entity_id
    ] as HassEntity | undefined;
    if (Array.isArray(condition.state)) {
      for (const state of condition.state.values()) {
        states.push(
          stateObj
            ? condition.attribute
              ? hass
                  .formatEntityAttributeValue(
                    stateObj,
                    condition.attribute,
                    state
                  )
                  .toString()
              : hass.formatEntityState(stateObj, state)
            : state
        );
      }
    } else if (condition.state !== "") {
      states.push(
        stateObj
          ? condition.attribute
            ? hass
                .formatEntityAttributeValue(
                  stateObj,
                  condition.attribute,
                  condition.state
                )
                .toString()
            : hass.formatEntityState(stateObj, condition.state.toString())
          : condition.state.toString()
      );
    }

    let duration = "";
    if (condition.for) {
      duration = describeDuration(hass.locale, condition.for) || "";
    }

    return hass.localize(
      `${conditionsTranslationBaseKey}.state.description.full`,
      {
        hasAttribute: attribute !== "" ? "true" : "false",
        attribute: attribute,
        numberOfEntities: entities.length,
        entities:
          condition.match === "any"
            ? formatListWithOrs(hass.locale, entities)
            : formatListWithAnds(hass.locale, entities),
        numberOfStates: states.length,
        states: formatListWithOrs(hass.locale, states),
        hasDuration: duration !== "" ? "true" : "false",
        duration: duration,
      }
    );
  }

  // Numeric State Condition
  if (condition.condition === "numeric_state" && condition.entity_id) {
    const entity_ids = ensureArray(condition.entity_id);
    const stateObj = hass.states[entity_ids[0]] as HassEntity | undefined;
    const entity = formatListWithAnds(
      hass.locale,
      entity_ids.map((id) =>
        hass.states[id] ? computeStateName(hass.states[id]) : id || ""
      )
    );

    const attribute = condition.attribute
      ? stateObj
        ? computeAttributeNameDisplay(
            hass.localize,
            stateObj,
            hass.entities,
            condition.attribute
          )
        : condition.attribute
      : undefined;

    if (condition.above !== undefined && condition.below !== undefined) {
      return hass.localize(
        `${conditionsTranslationBaseKey}.numeric_state.description.above-below`,
        {
          attribute,
          entity,
          numberOfEntities: entity_ids.length,
          above: condition.above,
          below: condition.below,
        }
      );
    }
    if (condition.above !== undefined) {
      return hass.localize(
        `${conditionsTranslationBaseKey}.numeric_state.description.above`,
        {
          attribute,
          entity,
          numberOfEntities: entity_ids.length,
          above: condition.above,
        }
      );
    }
    if (condition.below !== undefined) {
      return hass.localize(
        `${conditionsTranslationBaseKey}.numeric_state.description.below`,
        {
          attribute,
          entity,
          numberOfEntities: entity_ids.length,
          below: condition.below,
        }
      );
    }
  }

  // Time condition
  if (condition.condition === "time") {
    const weekdaysArray = ensureArray(condition.weekday);
    const validWeekdays =
      weekdaysArray && weekdaysArray.length > 0 && weekdaysArray.length < 7;
    if (condition.before || condition.after || validWeekdays) {
      const before =
        typeof condition.before !== "string"
          ? condition.before
          : condition.before.includes(".")
            ? `entity ${
                hass.states[condition.before]
                  ? computeStateName(hass.states[condition.before])
                  : condition.before
              }`
            : localizeTimeString(condition.before, hass.locale, hass.config);

      const after =
        typeof condition.after !== "string"
          ? condition.after
          : condition.after.includes(".")
            ? `entity ${
                hass.states[condition.after]
                  ? computeStateName(hass.states[condition.after])
                  : condition.after
              }`
            : localizeTimeString(condition.after, hass.locale, hass.config);

      let localizedDays: string[] = [];
      if (validWeekdays) {
        localizedDays = weekdaysArray.map((d) =>
          hass.localize(
            `ui.panel.config.automation.editor.conditions.type.time.weekdays.${d}`
          )
        );
      }

      let hasTime = "";
      if (after !== undefined && before !== undefined) {
        hasTime = "after_before";
      } else if (after !== undefined) {
        hasTime = "after";
      } else if (before !== undefined) {
        hasTime = "before";
      }

      return hass.localize(
        `${conditionsTranslationBaseKey}.time.description.full`,
        {
          hasTime: hasTime,
          hasTimeAndDay: (after || before) && validWeekdays ? "true" : "false",
          hasDay: validWeekdays ? "true" : "false",
          time_before: before,
          time_after: after,
          day: formatListWithOrs(hass.locale, localizedDays),
        }
      );
    }
  }

  // Sun condition
  if (condition.condition === "sun" && (condition.before || condition.after)) {
    let afterDuration = "";
    if (condition.after && condition.after_offset) {
      if (typeof condition.after_offset === "number") {
        afterDuration = secondsToDuration(condition.after_offset)!;
      } else if (typeof condition.after_offset === "string") {
        afterDuration = condition.after_offset;
      } else {
        afterDuration = JSON.stringify(condition.after_offset);
      }
    }

    let beforeDuration = "";
    if (condition.before && condition.before_offset) {
      if (typeof condition.before_offset === "number") {
        beforeDuration = secondsToDuration(condition.before_offset)!;
      } else if (typeof condition.before_offset === "string") {
        beforeDuration = condition.before_offset;
      } else {
        beforeDuration = JSON.stringify(condition.before_offset);
      }
    }

    return hass.localize(
      `${conditionsTranslationBaseKey}.sun.description.full`,
      {
        afterChoice: condition.after ?? "other",
        afterOffsetChoice: afterDuration !== "" ? "offset" : "other",
        afterOffset: afterDuration,
        beforeChoice: condition.before ?? "other",
        beforeOffsetChoice: beforeDuration !== "" ? "offset" : "other",
        beforeOffset: beforeDuration,
      }
    );
  }

  // Zone condition
  if (condition.condition === "zone" && condition.entity_id && condition.zone) {
    const entities: string[] = [];
    const zones: string[] = [];

    const states = hass.states;

    if (Array.isArray(condition.entity_id)) {
      for (const entity of condition.entity_id.values()) {
        if (states[entity]) {
          entities.push(computeStateName(states[entity]) || entity);
        }
      }
    } else {
      entities.push(
        states[condition.entity_id]
          ? computeStateName(states[condition.entity_id])
          : condition.entity_id
      );
    }

    if (Array.isArray(condition.zone)) {
      for (const zone of condition.zone.values()) {
        if (states[zone]) {
          zones.push(computeStateName(states[zone]) || zone);
        }
      }
    } else {
      zones.push(
        states[condition.zone]
          ? computeStateName(states[condition.zone])
          : condition.zone
      );
    }

    const entitiesString = formatListWithOrs(hass.locale, entities);
    const zonesString = formatListWithOrs(hass.locale, zones);
    return hass.localize(
      `${conditionsTranslationBaseKey}.zone.description.full`,
      {
        entity: entitiesString,
        numberOfEntities: entities.length,
        zone: zonesString,
        numberOfZones: zones.length,
      }
    );
  }

  if (condition.condition === "device" && condition.device_id) {
    const config = condition as DeviceCondition;
    const localized = localizeDeviceAutomationCondition(
      hass,
      entityRegistry,
      config
    );
    if (localized) {
      return localized;
    }
    const stateObj = hass.states[config.entity_id as string] as
      | HassEntity
      | undefined;
    return `${stateObj ? computeStateName(stateObj) : config.entity_id} ${
      config.type
    }`;
  }

  if (condition.condition === "template") {
    return hass.localize(
      `${conditionsTranslationBaseKey}.template.description.full`
    );
  }

  if (condition.condition === "trigger" && condition.id != null) {
    return hass.localize(
      `${conditionsTranslationBaseKey}.trigger.description.full`,
      {
        id: formatListWithOrs(
          hass.locale,
          ensureArray(condition.id).map((id) => id.toString())
        ),
      }
    );
  }

  return (
    hass.localize(
      `ui.panel.config.automation.editor.conditions.type.${condition.condition}.label`
    ) ||
    hass.localize(
      `ui.panel.config.automation.editor.conditions.unknown_condition`
    )
  );
};
