import { TZDate } from "@date-fns/tz";
import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
import {
  formatDurationDigital,
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
import { hasTemplate } from "../common/string/has-template";
import type { LocalizeFunc } from "../common/translations/localize";
import type { HomeAssistant, HomeAssistantFormatters } from "../types";
import type {
  Condition,
  ForDict,
  LegacyCondition,
  LegacyTrigger,
  Trigger,
} from "./automation";
import { flattenTriggers } from "./automation";
import { getConditionDomain, getConditionObjectId } from "./condition";
import type {
  DeviceCondition,
  DeviceTrigger,
} from "./device/device_automation";
import {
  localizeDeviceAutomationCondition,
  localizeDeviceAutomationTrigger,
} from "./device/device_automation";
import type { EntityRegistryEntry } from "./entity/entity_registry";
import type { FrontendLocaleData } from "./translation";
import { getTriggerDomain, getTriggerObjectId, isTriggerList } from "./trigger";

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
    const hours = Number(chunks[0]);
    const minutes = Number(chunks[1]);
    const seconds = chunks.length > 2 ? Number(chunks[2]) : 0;
    // Create date in the server timezone so formatTime converts correctly
    // when the user's browser timezone differs from the HA server timezone.
    const now = new Date();
    const dt = new TZDate(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      seconds,
      config.time_zone
    );
    if (chunks.length === 2 || seconds === 0) {
      return formatTime(dt, locale, config);
    }
    return formatTimeWithSeconds(dt, locale, config);
  } catch {
    return time;
  }
};

const formatNumericLimitValue = (
  states: HomeAssistant["states"],
  value?: number | string
) => {
  if (typeof value !== "string" || !isValidEntityId(value)) {
    return value;
  }

  return states[value] ? computeStateName(states[value]) || value : value;
};

export interface TriggerInfo {
  id: string;
  label: string;
  triggerType: string;
  count: number;
}

export const getTriggerInfos = (
  triggers: Trigger[] | undefined,
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  entityRegistry: EntityRegistryEntry[],
  states: HomeAssistant["states"],
  entities: HomeAssistant["entities"],
  config: HomeAssistant["config"],
  formatEntityState: HomeAssistantFormatters["formatEntityState"],
  formatEntityAttributeValue: HomeAssistantFormatters["formatEntityAttributeValue"]
): TriggerInfo[] => {
  if (!triggers) {
    return [];
  }
  const map = new Map<string, TriggerInfo>();
  for (const t of flattenTriggers(triggers)) {
    if (isTriggerList(t) || !t.id) {
      continue;
    }
    const existing = map.get(t.id);
    if (existing) {
      existing.count++;
    } else {
      map.set(t.id, {
        id: t.id,
        label: describeTrigger(
          t,
          localize,
          locale,
          entityRegistry,
          states,
          entities,
          config,
          formatEntityState,
          formatEntityAttributeValue
        ),
        triggerType: t.trigger,
        count: 1,
      });
    }
  }
  return Array.from(map.values());
};

export const describeTrigger = (
  trigger: Trigger,
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  entityRegistry: EntityRegistryEntry[],
  states: HomeAssistant["states"],
  entities: HomeAssistant["entities"],
  config: HomeAssistant["config"],
  formatEntityState: HomeAssistantFormatters["formatEntityState"],
  formatEntityAttributeValue: HomeAssistantFormatters["formatEntityAttributeValue"],
  ignoreAlias = false
): string => {
  try {
    const description = tryDescribeTrigger(
      trigger,
      localize,
      locale,
      entityRegistry,
      states,
      entities,
      config,
      formatEntityState,
      formatEntityAttributeValue,
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
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  entityRegistry: EntityRegistryEntry[],
  states: HomeAssistant["states"],
  entities: HomeAssistant["entities"],
  config: HomeAssistant["config"],
  formatEntityState: HomeAssistantFormatters["formatEntityState"],
  formatEntityAttributeValue: HomeAssistantFormatters["formatEntityAttributeValue"],
  ignoreAlias = false
) => {
  if (isTriggerList(trigger)) {
    const triggers = ensureArray(trigger.triggers);

    if (!triggers || triggers.length === 0) {
      return localize(
        `${triggerTranslationBaseKey}.list.description.no_trigger`
      );
    }
    const count = triggers.length;
    return localize(`${triggerTranslationBaseKey}.list.description.full`, {
      count: count,
    });
  }

  if (trigger.alias && !ignoreAlias) {
    return trigger.alias;
  }

  const description = describeLegacyTrigger(
    trigger as LegacyTrigger,
    locale,
    localize,
    config,
    entityRegistry,
    states,
    entities,
    formatEntityState,
    formatEntityAttributeValue
  );

  if (description) {
    return description;
  }

  const triggerType = trigger.trigger;

  const domain = getTriggerDomain(trigger.trigger);
  const type = getTriggerObjectId(trigger.trigger);

  return (
    localize(`component.${domain}.triggers.${type}.name`) ||
    localize(
      `ui.panel.config.automation.editor.triggers.type.${triggerType as LegacyTrigger["trigger"]}.label`
    ) ||
    localize(`ui.panel.config.automation.editor.triggers.unknown_trigger`)
  );
};

const describeLegacyTrigger = (
  trigger: LegacyTrigger,
  locale: FrontendLocaleData,
  localize: LocalizeFunc,
  hassConfig: HomeAssistant["config"],
  entityRegistry: EntityRegistryEntry[],
  states: HomeAssistant["states"],
  hassEntities: HomeAssistant["entities"],
  formatEntityState: HomeAssistantFormatters["formatEntityState"],
  formatEntityAttributeValue: HomeAssistantFormatters["formatEntityAttributeValue"]
) => {
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

    const eventTypesString = formatListWithOrs(locale, eventTypes);
    return localize(`${triggerTranslationBaseKey}.event.description.full`, {
      eventTypes: eventTypesString,
    });
  }

  // Home Assistant Trigger
  if (trigger.trigger === "homeassistant" && trigger.event) {
    return localize(
      trigger.event === "start"
        ? `${triggerTranslationBaseKey}.homeassistant.description.started`
        : `${triggerTranslationBaseKey}.homeassistant.description.shutdown`
    );
  }

  // Numeric State Trigger
  if (trigger.trigger === "numeric_state" && trigger.entity_id) {
    const entities: string[] = [];

    const stateObj = Array.isArray(trigger.entity_id)
      ? states[trigger.entity_id[0]]
      : (states[trigger.entity_id] as HassEntity | undefined);

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
            localize,
            stateObj,
            hassEntities,
            trigger.attribute
          )
        : trigger.attribute
      : undefined;

    const duration = trigger.for
      ? describeDuration(locale, trigger.for)
      : undefined;

    if (trigger.above !== undefined && trigger.below !== undefined) {
      return localize(
        `${triggerTranslationBaseKey}.numeric_state.description.above-below`,
        {
          attribute: attribute,
          entity: formatListWithOrs(locale, entities),
          numberOfEntities: entities.length,
          above: formatNumericLimitValue(states, trigger.above),
          below: formatNumericLimitValue(states, trigger.below),
          duration: duration,
        }
      );
    }
    if (trigger.above !== undefined) {
      return localize(
        `${triggerTranslationBaseKey}.numeric_state.description.above`,
        {
          attribute: attribute,
          entity: formatListWithOrs(locale, entities),
          numberOfEntities: entities.length,
          above: formatNumericLimitValue(states, trigger.above),
          duration: duration,
        }
      );
    }
    if (trigger.below !== undefined) {
      return localize(
        `${triggerTranslationBaseKey}.numeric_state.description.below`,
        {
          attribute: attribute,
          entity: formatListWithOrs(locale, entities),
          numberOfEntities: entities.length,
          below: formatNumericLimitValue(states, trigger.below),
          duration: duration,
        }
      );
    }
  }

  // State Trigger
  if (trigger.trigger === "state") {
    const entities: string[] = [];

    let attribute = "";
    if (trigger.attribute) {
      const stateObj = Array.isArray(trigger.entity_id)
        ? states[trigger.entity_id[0]]
        : (states[trigger.entity_id] as HassEntity | undefined);
      attribute = stateObj
        ? computeAttributeNameDisplay(
            localize,
            stateObj,
            hassEntities,
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

    const stateObj = states[entityArray[0]] as HassEntity | undefined;

    let fromChoice = "other";
    let fromString = "";
    if (trigger.from !== undefined) {
      if (trigger.from === null) {
        if (!trigger.attribute) {
          fromChoice = "null";
        }
      } else {
        const fromArray = ensureArray(trigger.from);

        const from: string[] = [];
        for (const state of fromArray) {
          from.push(
            stateObj
              ? trigger.attribute
                ? formatEntityAttributeValue(
                    stateObj,
                    trigger.attribute,
                    state
                  ).toString()
                : formatEntityState(stateObj, state)
              : state
          );
        }
        if (from.length !== 0) {
          fromString = formatListWithOrs(locale, from);
          fromChoice = "fromUsed";
        }
      }
    }

    let toChoice = "other";
    let toString = "";
    if (trigger.to !== undefined) {
      if (trigger.to === null) {
        if (!trigger.attribute) {
          toChoice = "null";
        }
      } else {
        const toArray = ensureArray(trigger.to);

        const to: string[] = [];
        for (const state of toArray) {
          to.push(
            stateObj
              ? trigger.attribute
                ? formatEntityAttributeValue(
                    stateObj,
                    trigger.attribute,
                    state
                  ).toString()
                : formatEntityState(stateObj, state).toString()
              : state
          );
        }
        if (to.length !== 0) {
          toString = formatListWithOrs(locale, to);
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
      duration = describeDuration(locale, trigger.for) ?? "";
    }

    return localize(`${triggerTranslationBaseKey}.state.description.full`, {
      hasAttribute: attribute !== "" ? "true" : "false",
      attribute: attribute,
      hasEntity: entities.length !== 0 ? "true" : "false",
      entity: formatListWithOrs(locale, entities),
      fromChoice: fromChoice,
      fromString: fromString,
      toChoice: toChoice,
      toString: toString,
      hasDuration: duration !== "" ? "true" : "false",
      duration: duration,
    });
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

    return localize(
      trigger.event === "sunset"
        ? `${triggerTranslationBaseKey}.sun.description.sets`
        : `${triggerTranslationBaseKey}.sun.description.rises`,
      { hasDuration: duration !== "" ? "true" : "false", duration: duration }
    );
  }

  // Tag Trigger
  if (trigger.trigger === "tag") {
    const entity = Object.values(states).find(
      (state) =>
        state.entity_id.startsWith("tag.") &&
        state.attributes.tag_id === trigger.tag_id
    );
    return entity
      ? localize(`${triggerTranslationBaseKey}.tag.description.known_tag`, {
          tag_name: computeStateName(entity),
        })
      : localize(`${triggerTranslationBaseKey}.tag.description.full`);
  }

  // Time Trigger
  if (trigger.trigger === "time" && trigger.at) {
    const result = ensureArray(trigger.at).map((at) => {
      if (typeof at === "string") {
        if (isValidEntityId(at)) {
          return `entity ${states[at] ? computeStateName(states[at]) : at}`;
        }
        return localizeTimeString(at, locale, hassConfig);
      }
      const entityStr = `entity ${states[at.entity_id] ? computeStateName(states[at.entity_id]) : at.entity_id}`;
      const offsetStr = at.offset
        ? " " +
          localize(`${triggerTranslationBaseKey}.time.offset_by`, {
            offset: describeDuration(locale, at.offset),
          })
        : "";
      return `${entityStr}${offsetStr}`;
    });

    // Handle weekday information if present
    let weekdays: string[] = [];
    if (trigger.weekday) {
      const weekdayArray = ensureArray(trigger.weekday);
      if (weekdayArray.length > 0) {
        weekdays = weekdayArray.map((day) =>
          localize(
            `ui.panel.config.automation.editor.triggers.type.time.weekdays.${day}` as any
          )
        );
      }
    }

    return localize(`${triggerTranslationBaseKey}.time.description.full`, {
      time: formatListWithOrs(locale, result),
      hasWeekdays: weekdays.length > 0 ? "true" : "false",
      weekdays: formatListWithOrs(locale, weekdays),
    });
  }

  // Time Pattern Trigger
  if (trigger.trigger === "time_pattern") {
    if (!trigger.seconds && !trigger.minutes && !trigger.hours) {
      return localize(
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
      | "has_seconds_or_minutes";

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
      return localize(
        `${triggerTranslationBaseKey}.time_pattern.description.invalid`,
        {
          parts: formatListWithAnds(
            locale,
            invalidParts.map((invalidPart) =>
              localize(
                `${triggerTranslationBaseKey}.time_pattern.${invalidPart}`
              )
            )
          ),
        }
      );
    }

    return localize(
      `${triggerTranslationBaseKey}.time_pattern.description.full`,
      {
        secondsChoice: secondsChoice,
        minutesChoice: minutesChoice,
        hoursChoice: hoursChoice,
        seconds: seconds,
        minutes: minutes,
        hours: hours,
        secondsWithOrdinal: localize(
          `${triggerTranslationBaseKey}.time_pattern.description.ordinal`,
          {
            part: seconds,
          }
        ),
        minutesWithOrdinal: localize(
          `${triggerTranslationBaseKey}.time_pattern.description.ordinal`,
          {
            part: minutes,
          }
        ),
        hoursWithOrdinal: localize(
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

    return localize(`${triggerTranslationBaseKey}.zone.description.full`, {
      entity: formatListWithOrs(locale, entities),
      event: trigger.event.toString(),
      zone: formatListWithOrs(locale, zones),
      numberOfZones: zones.length,
    });
  }

  // Geo Location Trigger
  if (trigger.trigger === "geo_location" && trigger.source && trigger.zone) {
    const sources: string[] = [];
    const zones: string[] = [];

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

    return localize(
      `${triggerTranslationBaseKey}.geo_location.description.full`,
      {
        source: formatListWithOrs(locale, sources),
        event: trigger.event.toString(),
        zone: formatListWithOrs(locale, zones),
        numberOfZones: zones.length,
      }
    );
  }

  // MQTT Trigger
  if (trigger.trigger === "mqtt") {
    return localize(`${triggerTranslationBaseKey}.mqtt.description.full`);
  }

  // Template Trigger
  if (trigger.trigger === "template") {
    let duration = "";
    if (trigger.for) {
      duration = describeDuration(locale, trigger.for) ?? "";
    }

    return localize(`${triggerTranslationBaseKey}.template.description.full`, {
      hasDuration: duration !== "" ? "true" : "false",
      duration: duration,
    });
  }

  // Webhook Trigger
  if (trigger.trigger === "webhook") {
    return localize(`${triggerTranslationBaseKey}.webhook.description.full`);
  }

  // Conversation Trigger
  if (trigger.trigger === "conversation") {
    if (!trigger.command || !trigger.command.length) {
      return localize(
        `${triggerTranslationBaseKey}.conversation.description.empty`
      );
    }

    const commands = ensureArray(trigger.command);

    if (commands.length === 1) {
      return localize(
        `${triggerTranslationBaseKey}.conversation.description.single`,
        {
          sentence: commands[0],
        }
      );
    }
    return localize(
      `${triggerTranslationBaseKey}.conversation.description.multiple`,
      {
        sentence: commands[0],
        count: commands.length - 1,
      }
    );
  }

  // Persistent Notification Trigger
  if (trigger.trigger === "persistent_notification") {
    return localize(
      `${triggerTranslationBaseKey}.persistent_notification.description.full`
    );
  }

  // Device Trigger
  if (trigger.trigger === "device" && trigger.device_id) {
    const config = trigger as DeviceTrigger;
    const localized = localizeDeviceAutomationTrigger(
      localize,
      states,
      entityRegistry,
      config
    );
    if (localized) {
      return localized;
    }
    const stateObj = states[config.entity_id as string] as
      | HassEntity
      | undefined;
    return `${stateObj ? computeStateName(stateObj) : config.entity_id} ${
      config.type
    }`;
  }

  // Calendar Trigger
  if (trigger.trigger === "calendar") {
    const calendarEntity = states[trigger.entity_id]
      ? computeStateName(states[trigger.entity_id])
      : trigger.entity_id;

    let offsetChoice = "other";
    let offset = "";
    if (trigger.offset) {
      offsetChoice = trigger.offset.startsWith("-") ? "before" : "after";
      const parts = trigger.offset.startsWith("-")
        ? trigger.offset.substring(1).split(":")
        : trigger.offset.split(":");
      const duration = {
        hours: parts.length > 0 ? +parts[0] : 0,
        minutes: parts.length > 1 ? +parts[1] : 0,
        seconds: parts.length > 2 ? +parts[2] : 0,
      };
      offset = formatDurationLong(locale, duration);
      if (offset === "") {
        offsetChoice = "other";
      }
    }

    return localize(`${triggerTranslationBaseKey}.calendar.description.full`, {
      eventChoice: trigger.event,
      offsetChoice: offsetChoice,
      offset: offset,
      hasCalendar: trigger.entity_id ? "true" : "false",
      calendar: calendarEntity,
    });
  }
  return undefined;
};

const formatSunOffset = (
  locale: FrontendLocaleData,
  offset?: number | string | ForDict
): string => {
  if (!offset) {
    return "";
  }
  if (typeof offset === "number") {
    return secondsToDuration(offset)!;
  }
  if (typeof offset === "string") {
    return offset;
  }
  try {
    const formatted = formatDurationDigital(locale, offset);
    return formatted.startsWith("-") ? formatted : `+${formatted}`;
  } catch (_e) {
    return JSON.stringify(offset);
  }
};

export const describeCondition = (
  condition: Condition,
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  entityRegistry: EntityRegistryEntry[],
  hassStates: HomeAssistant["states"],
  hassEntities: HomeAssistant["entities"],
  hassConfig: HomeAssistant["config"],
  formatEntityState: HomeAssistantFormatters["formatEntityState"],
  formatEntityAttributeValue: HomeAssistantFormatters["formatEntityAttributeValue"],
  ignoreAlias = false
): string => {
  try {
    const description = tryDescribeCondition(
      condition,
      localize,
      locale,
      entityRegistry,
      hassStates,
      hassEntities,
      hassConfig,
      formatEntityState,
      formatEntityAttributeValue,
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
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  entityRegistry: EntityRegistryEntry[],
  hassStates: HomeAssistant["states"],
  hassEntities: HomeAssistant["entities"],
  hassConfig: HomeAssistant["config"],
  formatEntityState: HomeAssistantFormatters["formatEntityState"],
  formatEntityAttributeValue: HomeAssistantFormatters["formatEntityAttributeValue"],
  ignoreAlias = false
) => {
  if (typeof condition === "string" && hasTemplate(condition)) {
    return localize(
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

  const description = describeLegacyCondition(
    condition as LegacyCondition,
    localize,
    locale,
    entityRegistry,
    hassStates,
    hassEntities,
    hassConfig,
    formatEntityState,
    formatEntityAttributeValue
  );

  if (description) {
    return description;
  }

  const conditionType = condition.condition;

  const domain = getConditionDomain(condition.condition);
  const type = getConditionObjectId(condition.condition);

  return (
    localize(`component.${domain}.conditions.${type}.name`) ||
    localize(
      `ui.panel.config.automation.editor.conditions.type.${conditionType as LegacyCondition["condition"]}.label`
    ) ||
    localize(`ui.panel.config.automation.editor.conditions.unknown_condition`)
  );
};

const describeLegacyCondition = (
  condition: LegacyCondition,
  localize: LocalizeFunc,
  locale: FrontendLocaleData,
  entityRegistry: EntityRegistryEntry[],
  hassStates: HomeAssistant["states"],
  hassEntities: HomeAssistant["entities"],
  hassConfig: HomeAssistant["config"],
  formatEntityState: HomeAssistantFormatters["formatEntityState"],
  formatEntityAttributeValue: HomeAssistantFormatters["formatEntityAttributeValue"]
) => {
  if (condition.condition === "or") {
    const conditions = ensureArray(condition.conditions);

    if (!conditions || conditions.length === 0) {
      return localize(
        `${conditionsTranslationBaseKey}.or.description.no_conditions`
      );
    }
    const count = conditions.length;
    return localize(`${conditionsTranslationBaseKey}.or.description.full`, {
      count: count,
    });
  }

  if (condition.condition === "and") {
    const conditions = ensureArray(condition.conditions);

    if (!conditions || conditions.length === 0) {
      return localize(
        `${conditionsTranslationBaseKey}.and.description.no_conditions`
      );
    }
    const count = conditions.length;
    return localize(`${conditionsTranslationBaseKey}.and.description.full`, {
      count: count,
    });
  }

  if (condition.condition === "not") {
    const conditions = ensureArray(condition.conditions);

    if (!conditions || conditions.length === 0) {
      return localize(
        `${conditionsTranslationBaseKey}.not.description.no_conditions`
      );
    }
    if (conditions.length === 1) {
      return localize(
        `${conditionsTranslationBaseKey}.not.description.one_condition`
      );
    }
    return localize(`${conditionsTranslationBaseKey}.not.description.full`, {
      count: conditions.length,
    });
  }

  // State Condition
  if (condition.condition === "state") {
    if (!condition.entity_id) {
      return localize(
        `${conditionsTranslationBaseKey}.state.description.no_entity`
      );
    }

    let attribute = "";
    if (condition.attribute) {
      const stateObj = Array.isArray(condition.entity_id)
        ? hassStates[condition.entity_id[0]]
        : (hassStates[condition.entity_id] as HassEntity | undefined);
      attribute = stateObj
        ? computeAttributeNameDisplay(
            localize,
            stateObj,
            hassEntities,
            condition.attribute
          )
        : condition.attribute;
    }

    const entities: string[] = [];
    if (Array.isArray(condition.entity_id)) {
      for (const entity of condition.entity_id.values()) {
        if (hassStates[entity]) {
          entities.push(computeStateName(hassStates[entity]) || entity);
        }
      }
    } else if (condition.entity_id) {
      entities.push(
        hassStates[condition.entity_id]
          ? computeStateName(hassStates[condition.entity_id])
          : condition.entity_id
      );
    }

    const states: string[] = [];
    const stateObj = hassStates[
      Array.isArray(condition.entity_id)
        ? condition.entity_id[0]
        : condition.entity_id
    ] as HassEntity | undefined;
    if (Array.isArray(condition.state)) {
      for (const state of condition.state.values()) {
        states.push(
          stateObj
            ? condition.attribute
              ? formatEntityAttributeValue(
                  stateObj,
                  condition.attribute,
                  state
                ).toString()
              : formatEntityState(stateObj, state)
            : state
        );
      }
    } else if (condition.state !== "") {
      states.push(
        stateObj
          ? condition.attribute
            ? formatEntityAttributeValue(
                stateObj,
                condition.attribute,
                condition.state
              ).toString()
            : formatEntityState(stateObj, condition.state.toString())
          : condition.state.toString()
      );
    }

    let duration = "";
    if (condition.for) {
      duration = describeDuration(locale, condition.for) || "";
    }

    return localize(`${conditionsTranslationBaseKey}.state.description.full`, {
      hasAttribute: attribute !== "" ? "true" : "false",
      attribute: attribute,
      numberOfEntities: entities.length,
      entities:
        condition.match === "any"
          ? formatListWithOrs(locale, entities)
          : formatListWithAnds(locale, entities),
      numberOfStates: states.length,
      states: formatListWithOrs(locale, states),
      hasDuration: duration !== "" ? "true" : "false",
      duration: duration,
    });
  }

  // Numeric State Condition
  if (condition.condition === "numeric_state" && condition.entity_id) {
    const entity_ids = ensureArray(condition.entity_id);
    const stateObj = hassStates[entity_ids[0]] as HassEntity | undefined;
    const entity = formatListWithAnds(
      locale,
      entity_ids.map((id) =>
        hassStates[id] ? computeStateName(hassStates[id]) : id || ""
      )
    );

    const attribute = condition.attribute
      ? stateObj
        ? computeAttributeNameDisplay(
            localize,
            stateObj,
            hassEntities,
            condition.attribute
          )
        : condition.attribute
      : undefined;

    if (condition.above !== undefined && condition.below !== undefined) {
      return localize(
        `${conditionsTranslationBaseKey}.numeric_state.description.above-below`,
        {
          attribute,
          entity,
          numberOfEntities: entity_ids.length,
          above: formatNumericLimitValue(hassStates, condition.above),
          below: formatNumericLimitValue(hassStates, condition.below),
        }
      );
    }
    if (condition.above !== undefined) {
      return localize(
        `${conditionsTranslationBaseKey}.numeric_state.description.above`,
        {
          attribute,
          entity,
          numberOfEntities: entity_ids.length,
          above: formatNumericLimitValue(hassStates, condition.above),
        }
      );
    }
    if (condition.below !== undefined) {
      return localize(
        `${conditionsTranslationBaseKey}.numeric_state.description.below`,
        {
          attribute,
          entity,
          numberOfEntities: entity_ids.length,
          below: formatNumericLimitValue(hassStates, condition.below),
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
                hassStates[condition.before]
                  ? computeStateName(hassStates[condition.before])
                  : condition.before
              }`
            : localizeTimeString(condition.before, locale, hassConfig);

      const after =
        typeof condition.after !== "string"
          ? condition.after
          : condition.after.includes(".")
            ? `entity ${
                hassStates[condition.after]
                  ? computeStateName(hassStates[condition.after])
                  : condition.after
              }`
            : localizeTimeString(condition.after, locale, hassConfig);

      let localizedDays: string[] = [];
      if (validWeekdays) {
        localizedDays = weekdaysArray.map((d) =>
          localize(
            `ui.panel.config.automation.editor.conditions.type.time.weekdays.${d}`
          )
        );
      }

      let hasTime = "";
      if (after !== undefined && before !== undefined) {
        if (
          typeof condition.after === "string" &&
          !condition.after.includes(".") &&
          typeof condition.before === "string" &&
          !condition.before.includes(".") &&
          condition.after > condition.before
        ) {
          hasTime = "after_before_or";
        } else {
          hasTime = "after_before";
        }
      } else if (after !== undefined) {
        hasTime = "after";
      } else if (before !== undefined) {
        hasTime = "before";
      }

      return localize(`${conditionsTranslationBaseKey}.time.description.full`, {
        hasTime: hasTime,
        hasTimeAndDay: (after || before) && validWeekdays ? "true" : "false",
        hasDay: validWeekdays ? "true" : "false",
        time_before: before,
        time_after: after,
        day: formatListWithOrs(locale, localizedDays),
      });
    }
  }

  // Sun condition
  if (condition.condition === "sun" && (condition.before || condition.after)) {
    const afterDuration = condition.after
      ? formatSunOffset(locale, condition.after_offset)
      : "";
    const beforeDuration = condition.before
      ? formatSunOffset(locale, condition.before_offset)
      : "";

    return localize(
      `${conditionsTranslationBaseKey}.sun.description.${condition.before && condition.after ? "between" : condition.before ? "before" : "after"}`,
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

    if (Array.isArray(condition.entity_id)) {
      for (const entity of condition.entity_id.values()) {
        if (hassStates[entity]) {
          entities.push(computeStateName(hassStates[entity]) || entity);
        }
      }
    } else {
      entities.push(
        hassStates[condition.entity_id]
          ? computeStateName(hassStates[condition.entity_id])
          : condition.entity_id
      );
    }

    if (Array.isArray(condition.zone)) {
      for (const zone of condition.zone.values()) {
        if (hassStates[zone]) {
          zones.push(computeStateName(hassStates[zone]) || zone);
        }
      }
    } else {
      zones.push(
        hassStates[condition.zone]
          ? computeStateName(hassStates[condition.zone])
          : condition.zone
      );
    }

    const entitiesString = formatListWithOrs(locale, entities);
    const zonesString = formatListWithOrs(locale, zones);
    return localize(`${conditionsTranslationBaseKey}.zone.description.full`, {
      entity: entitiesString,
      numberOfEntities: entities.length,
      zone: zonesString,
      numberOfZones: zones.length,
    });
  }

  if (condition.condition === "device" && condition.device_id) {
    const config = condition as DeviceCondition;
    const localized = localizeDeviceAutomationCondition(
      localize,
      hassStates,
      entityRegistry,
      config
    );
    if (localized) {
      return localized;
    }
    const stateObj = hassStates[config.entity_id as string] as
      | HassEntity
      | undefined;
    return `${stateObj ? computeStateName(stateObj) : config.entity_id} ${
      config.type
    }`;
  }

  if (condition.condition === "template") {
    return localize(
      `${conditionsTranslationBaseKey}.template.description.full`
    );
  }

  if (condition.condition === "trigger" && condition.id != null) {
    return localize(
      `${conditionsTranslationBaseKey}.trigger.description.full`,
      {
        id: formatListWithOrs(
          locale,
          ensureArray(condition.id).map((id) => id.toString())
        ),
      }
    );
  }

  return undefined;
};
