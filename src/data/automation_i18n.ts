import { HassConfig } from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
import { formatDuration } from "../common/datetime/format_duration";
import {
  formatTime,
  formatTimeWithSeconds,
} from "../common/datetime/format_time";
import secondsToDuration from "../common/datetime/seconds_to_duration";
import {
  computeAttributeNameDisplay,
  computeAttributeValueDisplay,
} from "../common/entity/compute_attribute_display";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import { computeStateName } from "../common/entity/compute_state_name";
import "../resources/intl-polyfill";
import type { HomeAssistant } from "../types";
import { Condition, ForDict, Trigger } from "./automation";
import {
  DeviceCondition,
  DeviceTrigger,
  localizeDeviceAutomationCondition,
  localizeDeviceAutomationTrigger,
} from "./device_automation";
import { EntityRegistryEntry } from "./entity_registry";
import { FrontendLocaleData } from "./translation";

const triggerTranslationBaseKey =
  "ui.panel.config.automation.editor.triggers.type";

const describeDuration = (forTime: number | string | ForDict) => {
  let duration: string | null;
  if (typeof forTime === "number") {
    duration = secondsToDuration(forTime);
  } else if (typeof forTime === "string") {
    duration = forTime;
  } else {
    duration = formatDuration(forTime);
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

const ordinalSuffix = (n: number) => {
  n %= 100;
  if ([11, 12, 13].includes(n)) {
    return "th";
  }
  if (n % 10 === 1) {
    return "st";
  }
  if (n % 10 === 2) {
    return "nd";
  }
  if (n % 10 === 3) {
    return "rd";
  }
  return "th";
};

export const describeTrigger = (
  trigger: Trigger,
  hass: HomeAssistant,
  entityRegistry: EntityRegistryEntry[],
  ignoreAlias = false
) => {
  try {
    return tryDescribeTrigger(trigger, hass, entityRegistry, ignoreAlias);
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
  if (trigger.alias && !ignoreAlias) {
    return trigger.alias;
  }

  const disjunctionFormatter = new Intl.ListFormat("en", {
    style: "long",
    type: "disjunction",
  });

  // Event Trigger
  if (trigger.platform === "event" && trigger.event_type) {
    const eventTypes: string[] = [];

    if (Array.isArray(trigger.event_type)) {
      for (const state of trigger.event_type.values()) {
        eventTypes.push(state);
      }
    } else {
      eventTypes.push(trigger.event_type);
    }

    const eventTypesString = disjunctionFormatter.format(eventTypes);
    return hass.localize(
      `${triggerTranslationBaseKey}.event.description.full`,
      { eventTypes: eventTypesString }
    );
  }

  // Home Assistant Trigger
  if (trigger.platform === "homeassistant" && trigger.event) {
    return hass.localize(
      trigger.event === "start"
        ? `${triggerTranslationBaseKey}.homeassistant.description.started`
        : `${triggerTranslationBaseKey}.homeassistant.description.shutdown`
    );
  }

  // Numeric State Trigger
  if (trigger.platform === "numeric_state" && trigger.entity_id) {
    let base = "When";
    const stateObj = hass.states[trigger.entity_id];
    const entity = stateObj ? computeStateName(stateObj) : trigger.entity_id;

    if (trigger.attribute) {
      base += ` ${computeAttributeNameDisplay(
        hass.localize,
        stateObj,
        hass.entities,
        trigger.attribute
      )} from`;
    }

    base += ` ${entity} is`;

    if (trigger.above !== undefined) {
      base += ` above ${trigger.above}`;
    }

    if (trigger.below !== undefined && trigger.above !== undefined) {
      base += " and";
    }

    if (trigger.below !== undefined) {
      base += ` below ${trigger.below}`;
    }

    if (trigger.for) {
      const duration = describeDuration(trigger.for);
      if (duration) {
        base += ` for ${duration}`;
      }
    }

    return base;
  }

  // State Trigger
  if (trigger.platform === "state") {
    let base = "When";
    const entities: string[] = [];
    const states = hass.states;

    if (trigger.attribute) {
      const stateObj = Array.isArray(trigger.entity_id)
        ? hass.states[trigger.entity_id[0]]
        : hass.states[trigger.entity_id];
      base += ` ${computeAttributeNameDisplay(
        hass.localize,
        stateObj,
        hass.entities,
        trigger.attribute
      )} of`;
    }

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

    if (entities.length === 0) {
      // no entity_id or empty array
      entities.push("something");
    }

    base += ` ${entities} changes`;

    const stateObj =
      hass.states[
        Array.isArray(trigger.entity_id)
          ? trigger.entity_id[0]
          : trigger.entity_id
      ];
    if (trigger.from !== undefined) {
      if (trigger.from === null) {
        if (!trigger.attribute) {
          base += " from any state";
        }
      } else if (Array.isArray(trigger.from)) {
        const from: string[] = [];
        for (const state of trigger.from.values()) {
          from.push(
            trigger.attribute
              ? computeAttributeValueDisplay(
                  hass.localize,
                  stateObj,
                  hass.locale,
                  hass.config,
                  hass.entities,
                  trigger.attribute,
                  state
                ).toString()
              : computeStateDisplay(
                  hass.localize,
                  stateObj,
                  hass.locale,
                  hass.config,
                  hass.entities,
                  state
                )
          );
        }
        if (from.length !== 0) {
          const fromString = disjunctionFormatter.format(from);
          base += ` from ${fromString}`;
        }
      } else {
        base += ` from ${
          trigger.attribute
            ? computeAttributeValueDisplay(
                hass.localize,
                stateObj,
                hass.locale,
                hass.config,
                hass.entities,
                trigger.attribute,
                trigger.from
              ).toString()
            : computeStateDisplay(
                hass.localize,
                stateObj,
                hass.locale,
                hass.config,
                hass.entities,
                trigger.from.toString()
              ).toString()
        }`;
      }
    }

    if (trigger.to !== undefined) {
      if (trigger.to === null) {
        if (!trigger.attribute) {
          base += " to any state";
        }
      } else if (Array.isArray(trigger.to)) {
        const to: string[] = [];
        for (const state of trigger.to.values()) {
          to.push(
            trigger.attribute
              ? computeAttributeValueDisplay(
                  hass.localize,
                  stateObj,
                  hass.locale,
                  hass.config,
                  hass.entities,
                  trigger.attribute,
                  state
                ).toString()
              : computeStateDisplay(
                  hass.localize,
                  stateObj,
                  hass.locale,
                  hass.config,
                  hass.entities,
                  state
                ).toString()
          );
        }
        if (to.length !== 0) {
          const toString = disjunctionFormatter.format(to);
          base += ` to ${toString}`;
        }
      } else {
        base += ` to ${
          trigger.attribute
            ? computeAttributeValueDisplay(
                hass.localize,
                stateObj,
                hass.locale,
                hass.config,
                hass.entities,
                trigger.attribute,
                trigger.to
              ).toString()
            : computeStateDisplay(
                hass.localize,
                stateObj,
                hass.locale,
                hass.config,
                hass.entities,
                trigger.to.toString()
              )
        }`;
      }
    }

    if (
      !trigger.attribute &&
      trigger.from === undefined &&
      trigger.to === undefined
    ) {
      base += " state or any attributes";
    }

    if (trigger.for) {
      const duration = describeDuration(trigger.for);
      if (duration) {
        base += ` for ${duration}`;
      }
    }

    return base;
  }

  // Sun Trigger
  if (trigger.platform === "sun" && trigger.event) {
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
      { hasDuration: duration !== "", duration: duration }
    );
  }

  // Tag Trigger
  if (trigger.platform === "tag") {
    return hass.localize(`${triggerTranslationBaseKey}.tag.description.full`);
  }

  // Time Trigger
  if (trigger.platform === "time" && trigger.at) {
    const result = ensureArray(trigger.at).map((at) =>
      typeof at !== "string"
        ? at
        : at.includes(".")
        ? `entity ${hass.states[at] ? computeStateName(hass.states[at]) : at}`
        : localizeTimeString(at, hass.locale, hass.config)
    );

    return hass.localize(`${triggerTranslationBaseKey}.time.description.full`, {
      time: disjunctionFormatter.format(result),
    });
  }

  // Time Pattern Trigger
  if (
    trigger.platform === "time_pattern" &&
    (trigger.seconds !== undefined ||
      trigger.minutes !== undefined ||
      trigger.hours !== undefined)
  ) {
    let result = "Trigger ";
    if (trigger.seconds !== undefined) {
      const seconds_all = trigger.seconds === "*";
      const seconds_interval =
        typeof trigger.seconds === "string" && trigger.seconds.startsWith("/");
      const seconds = seconds_all
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
        return "Invalid Time Pattern Seconds";
      }

      if (seconds_all) {
        result += "every second of ";
      } else if (seconds_interval) {
        result += `every ${seconds} seconds of `;
      } else {
        result += `on the ${seconds}${ordinalSuffix(seconds)} second of `;
      }
    }
    if (trigger.minutes !== undefined) {
      const minutes_all = trigger.minutes === "*";
      const minutes_interval =
        typeof trigger.minutes === "string" && trigger.minutes.startsWith("/");
      const minutes = minutes_all
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
        return "Invalid Time Pattern Minutes";
      }

      if (minutes_all) {
        result += "every minute of ";
      } else if (minutes_interval) {
        result += `every ${minutes} minutes of `;
      } else {
        result += `${
          trigger.seconds !== undefined ? "" : "on"
        } the ${minutes}${ordinalSuffix(minutes)} minute of `;
      }
    } else if (trigger.seconds !== undefined) {
      if (trigger.hours !== undefined) {
        result += `the 0${ordinalSuffix(0)} minute of `;
      } else {
        result += "every minute of ";
      }
    }
    if (trigger.hours !== undefined) {
      const hours_all = trigger.hours === "*";
      const hours_interval =
        typeof trigger.hours === "string" && trigger.hours.startsWith("/");
      const hours = hours_all
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
        return "Invalid Time Pattern Hours";
      }

      if (hours_all) {
        result += "every hour";
      } else if (hours_interval) {
        result += `every ${hours} hours`;
      } else {
        result += `${
          trigger.seconds !== undefined || trigger.minutes !== undefined
            ? ""
            : "on"
        } the ${hours}${ordinalSuffix(hours)} hour`;
      }
    } else {
      result += "every hour";
    }
    return result;
  }

  // Zone Trigger
  if (trigger.platform === "zone" && trigger.entity_id && trigger.zone) {
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

    const entitiesString = disjunctionFormatter.format(entities);
    const zonesString = disjunctionFormatter.format(zones);
    return `When ${entitiesString} ${trigger.event}s ${zonesString} ${
      zones.length > 1 ? "zones" : "zone"
    }`;
  }

  // Geo Location Trigger
  if (trigger.platform === "geo_location" && trigger.source && trigger.zone) {
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

    const sourcesString = disjunctionFormatter.format(sources);
    const zonesString = disjunctionFormatter.format(zones);
    return `When ${sourcesString} ${trigger.event}s ${zonesString} ${
      zones.length > 1 ? "zones" : "zone"
    }`;
  }

  // MQTT Trigger
  if (trigger.platform === "mqtt") {
    return hass.localize(`${triggerTranslationBaseKey}.mqtt.description.full`);
  }

  // Template Trigger
  if (trigger.platform === "template") {
    let duration = "";
    if (trigger.for) {
      duration = describeDuration(trigger.for) ?? "";
    }

    return hass.localize(
      `${triggerTranslationBaseKey}.template.description.full`,
      { hasDuration: duration !== "", duration: duration }
    );
  }

  // Webhook Trigger
  if (trigger.platform === "webhook") {
    return hass.localize(
      `${triggerTranslationBaseKey}.webhook.description.full`
    );
  }

  // Conversation Trigger
  if (trigger.platform === "conversation") {
    if (!trigger.command) {
      return hass.localize(
        `${triggerTranslationBaseKey}.conversation.description.empty`
      );
    }

    return hass.localize(
      `${triggerTranslationBaseKey}.conversation.description.full`,
      {
        sentence: disjunctionFormatter.format(
          ensureArray(trigger.command).map((cmd) => `'${cmd}'`)
        ),
      }
    );
  }

  // Persistent Notification Trigger
  if (trigger.platform === "persistent_notification") {
    return "When a persistent notification is updated";
  }

  // Device Trigger
  if (trigger.platform === "device") {
    if (!trigger.device_id) {
      return "Device trigger";
    }
    const config = trigger as DeviceTrigger;
    const localized = localizeDeviceAutomationTrigger(
      hass,
      entityRegistry,
      config
    );
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
  entityRegistry: EntityRegistryEntry[],
  ignoreAlias = false
) => {
  try {
    return tryDescribeCondition(condition, hass, entityRegistry, ignoreAlias);
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
  if (condition.alias && !ignoreAlias) {
    return condition.alias;
  }

  const conjunctionFormatter = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  });
  const disjunctionFormatter = new Intl.ListFormat("en", {
    style: "long",
    type: "disjunction",
  });

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

    if (!conditions || conditions.length === 0) {
      return "Test if any condition matches";
    }
    const count = conditions.length;
    return `Test if any of ${count} condition${count === 1 ? "" : "s"} matches`;
  }

  if (condition.condition === "and") {
    const conditions = ensureArray(condition.conditions);

    if (!conditions || conditions.length === 0) {
      return "Test if multiple conditions match";
    }
    const count = conditions.length;
    return `Test if ${count} condition${count === 1 ? "" : "s"} match${
      count === 1 ? "es" : ""
    }`;
  }

  if (condition.condition === "not") {
    const conditions = ensureArray(condition.conditions);

    if (!conditions || conditions.length === 0) {
      return "Test if no condition matches";
    }
    if (conditions.length === 1) {
      return "Test if 1 condition does not match";
    }
    return `Test if none of ${conditions.length} conditions match`;
  }

  // State Condition
  if (condition.condition === "state") {
    let base = "Confirm";
    if (!condition.entity_id) {
      return `${base} state`;
    }

    if (condition.attribute) {
      const stateObj = Array.isArray(condition.entity_id)
        ? hass.states[condition.entity_id[0]]
        : hass.states[condition.entity_id];
      base += ` ${computeAttributeNameDisplay(
        hass.localize,
        stateObj,
        hass.entities,
        condition.attribute
      )} of`;
    }

    if (Array.isArray(condition.entity_id)) {
      const entities: string[] = [];
      for (const entity of condition.entity_id.values()) {
        if (hass.states[entity]) {
          entities.push(computeStateName(hass.states[entity]) || entity);
        }
      }
      if (entities.length !== 0) {
        const entitiesString =
          condition.match === "any"
            ? disjunctionFormatter.format(entities)
            : conjunctionFormatter.format(entities);
        base += ` ${entitiesString} ${
          condition.entity_id.length > 1 ? "are" : "is"
        }`;
      } else {
        // no entity_id or empty array
        base += " an entity";
      }
    } else if (condition.entity_id) {
      base += ` ${
        hass.states[condition.entity_id]
          ? computeStateName(hass.states[condition.entity_id])
          : condition.entity_id
      } is`;
    }

    const states: string[] = [];
    const stateObj =
      hass.states[
        Array.isArray(condition.entity_id)
          ? condition.entity_id[0]
          : condition.entity_id
      ];
    if (Array.isArray(condition.state)) {
      for (const state of condition.state.values()) {
        states.push(
          condition.attribute
            ? computeAttributeValueDisplay(
                hass.localize,
                stateObj,
                hass.locale,
                hass.config,
                hass.entities,
                condition.attribute,
                state
              ).toString()
            : computeStateDisplay(
                hass.localize,
                stateObj,
                hass.locale,
                hass.config,
                hass.entities,
                state
              )
        );
      }
    } else if (condition.state !== "") {
      states.push(
        condition.attribute
          ? computeAttributeValueDisplay(
              hass.localize,
              stateObj,
              hass.locale,
              hass.config,
              hass.entities,
              condition.attribute,
              condition.state
            ).toString()
          : computeStateDisplay(
              hass.localize,
              stateObj,
              hass.locale,
              hass.config,
              hass.entities,
              condition.state.toString()
            )
      );
    }

    if (states.length === 0) {
      states.push("a state");
    }

    const statesString = disjunctionFormatter.format(states);
    base += ` ${statesString}`;

    if (condition.for) {
      const duration = describeDuration(condition.for);
      if (duration) {
        base += ` for ${duration}`;
      }
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

      let result = "Confirm the ";
      if (after || before) {
        result += "time is ";
      }
      if (after) {
        result += "after " + after;
      }
      if (before && after) {
        result += " and ";
      }
      if (before) {
        result += "before " + before;
      }
      if ((after || before) && validWeekdays) {
        result += " and the ";
      }
      if (validWeekdays) {
        const localizedDays = weekdaysArray.map((d) =>
          hass.localize(
            `ui.panel.config.automation.editor.conditions.type.time.weekdays.${d}`
          )
        );
        result += " day is " + disjunctionFormatter.format(localizedDays);
      }

      return result;
    }
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

    const entitiesString = disjunctionFormatter.format(entities);
    const zonesString = disjunctionFormatter.format(zones);
    return `Confirm ${entitiesString} ${
      entities.length > 1 ? "are" : "is"
    } in ${zonesString} ${zones.length > 1 ? "zones" : "zone"}`;
  }

  if (condition.condition === "device") {
    if (!condition.device_id) {
      return "Device condition";
    }
    const config = condition as DeviceCondition;
    const localized = localizeDeviceAutomationCondition(
      hass,
      entityRegistry,
      config
    );
    if (localized) {
      return localized;
    }
    const stateObj = hass.states[config.entity_id as string];
    return `${stateObj ? computeStateName(stateObj) : config.entity_id} ${
      config.type
    }`;
  }

  if (condition.condition === "trigger") {
    if (!condition.id) {
      return "Trigger condition";
    }
    return `When triggered by ${condition.id}`;
  }

  return `${
    condition.condition ? condition.condition.replace(/_/g, " ") : "Unknown"
  } condition`;
};
