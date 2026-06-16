import { isSameDay } from "date-fns";
import type { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityNameList } from "../../common/entity/compute_entity_name_display";
import { stateColorCss } from "../../common/entity/state_color";
import type { LocalizeKeys } from "../../common/translations/localize";
import { computeRTL } from "../../common/util/compute_rtl";
import { domainToName } from "../../data/integration";
import type { LogbookEntry } from "../../data/logbook";
import {
  createHistoricState,
  localizeStateMessage,
  parseTriggerSource,
} from "../../data/logbook";
import type { HomeAssistant } from "../../types";

export type LogbookEntryCategory = "entity" | "automation" | "integration";

export const TRIGGER_DOMAINS = ["automation", "script"];

export const stripEntityId = (message: string, entityId?: string) =>
  entityId ? message.replace(entityId, " ") : message;

export const classifyLogbookEntry = (
  item: LogbookEntry
): LogbookEntryCategory => {
  // State changes win even for automation/script entities (e.g. toggling an
  // automation on/off is a state change, not a run).
  if (item.entity_id && item.state !== undefined) {
    return "entity";
  }
  if (item.domain && TRIGGER_DOMAINS.includes(item.domain)) {
    return "automation";
  }
  return "integration";
};

// A device lives in exactly one area, so `device` (and `entity`) imply it too.
export type LogbookScope = "entity" | "device" | "area";

export interface EntityDisplay {
  primary?: string;
  secondary?: string;
}

export const entityDisplay = (
  hass: HomeAssistant,
  entityId: string,
  scope?: LogbookScope
): EntityDisplay => {
  const stateObj = hass.states[entityId] as HassEntity | undefined;
  if (!stateObj) {
    return {};
  }

  const [entityName, deviceName, areaName] = computeEntityNameList(
    stateObj,
    [{ type: "entity" }, { type: "device" }, { type: "area" }],
    hass.entities,
    hass.devices,
    hass.areas,
    hass.floors
  );

  const primary = entityName || deviceName || entityId;

  // Show the device only when the entity has its own name; otherwise the
  // device name is the subject and repeating it would duplicate it.
  const deviceQualifier = entityName ? deviceName : undefined;

  let parts: (string | undefined)[];
  switch (scope) {
    case "entity":
    case "device":
      parts = [];
      break;
    case "area":
      parts = [deviceQualifier];
      break;
    default:
      parts = [areaName, deviceQualifier];
  }

  const filtered = parts.filter(Boolean) as string[];
  const isRTL = computeRTL(
    hass.language,
    hass.translationMetadata.translations
  );
  const secondary = filtered.length
    ? filtered.join(isRTL ? " ◂ " : " ▸ ")
    : undefined;

  return { primary, secondary };
};

export const hasContext = (item: LogbookEntry) =>
  item.context_event_type || item.context_state || item.context_message;

export const sameDay = (a?: LogbookEntry, b?: LogbookEntry) =>
  !!a?.when && !!b?.when && isSameDay(a.when * 1000, b.when * 1000);

// Unavailable is flagged with an orange badge by the row, not a color change.
export const nodeColor = (
  category: LogbookEntryCategory,
  historicStateObj: HassEntity | undefined
): string | undefined => {
  if (category !== "entity" || !historicStateObj) {
    return undefined;
  }
  return stateColorCss(historicStateObj);
};

export type LogbookCauseType =
  | "user"
  | "automation"
  | "script"
  | "state"
  | "scheduled"
  | "homeassistant"
  | "integration";

export interface LogbookCause {
  type: LogbookCauseType;
  name: string;
  userId?: string;
  entityId?: string;
  brandDomain?: string;
}

export const computeLogbookCause = (
  hass: HomeAssistant,
  item: LogbookEntry,
  userIdToName: Record<string, string>
): LogbookCause | undefined => {
  const userName = item.context_user_id
    ? userIdToName[item.context_user_id]
    : undefined;
  if (userName) {
    return { type: "user", name: userName, userId: item.context_user_id };
  }

  if (
    item.context_event_type === "automation_triggered" ||
    item.context_event_type === "script_started"
  ) {
    const name =
      (item.context_entity_id
        ? entityDisplay(hass, item.context_entity_id).primary
        : undefined) ?? item.context_name;
    if (name) {
      return {
        type:
          item.context_event_type === "script_started"
            ? "script"
            : "automation",
        name,
        entityId: item.context_entity_id,
      };
    }
  }

  if (item.context_event_type === "call_service" && item.context_domain) {
    return {
      type: "integration",
      brandDomain: item.context_domain,
      name: domainToName(hass.localize, item.context_domain),
    };
  }

  if (item.context_state && item.context_entity_id) {
    const name =
      entityDisplay(hass, item.context_entity_id).primary ??
      item.context_entity_id_name;
    if (name) {
      return { type: "state", name, entityId: item.context_entity_id };
    }
  }

  if (
    item.domain &&
    TRIGGER_DOMAINS.includes(item.domain) &&
    !hasContext(item) &&
    item.source
  ) {
    const { platform, entityId } = parseTriggerSource(item.source);
    if (platform === "state" || platform === "numeric_state") {
      const name = entityId
        ? (entityDisplay(hass, entityId).primary ?? entityId)
        : hass.localize(
            `ui.components.logbook.trigger_type.${platform}` as LocalizeKeys
          ) || platform;
      return { type: "state", name, entityId };
    }
    if (platform === "time" || platform === "time_pattern") {
      return { type: "scheduled", name: "" };
    }
    if (platform === "homeassistant") {
      const key = item.source.startsWith("Home Assistant starting")
        ? "homeassistant_starting"
        : "homeassistant_stopping";
      return {
        type: "homeassistant",
        name:
          hass.localize(`ui.components.logbook.${key}` as LocalizeKeys) ||
          item.source,
      };
    }
    if (platform) {
      return {
        type: "integration",
        name:
          hass.localize(
            `ui.components.logbook.trigger_type.${platform}` as LocalizeKeys
          ) || platform,
      };
    }
  }

  if (item.context_name) {
    return item.context_domain
      ? {
          type: "integration",
          brandDomain: item.context_domain,
          name: item.context_name,
        }
      : { type: "integration", name: item.context_name };
  }

  return undefined;
};

export type LogbookGlyph =
  | { type: "state"; stateObj: HassEntity; icon?: string }
  | { type: "automation"; script: boolean }
  | { type: "brand"; domain?: string; icon?: string };

export const computeLogbookGlyph = (
  item: LogbookEntry,
  category: LogbookEntryCategory,
  stateObj: HassEntity | undefined,
  domain: string | undefined
): LogbookGlyph => {
  if (category === "automation") {
    return { type: "automation", script: domain === "script" };
  }
  if (stateObj) {
    return { type: "state", stateObj: stateObj, icon: item.icon };
  }
  return { type: "brand", domain, icon: item.icon };
};

export interface LogbookValue {
  text: string;
  type: "state" | "message";
}

const computeLogbookValue = (
  hass: HomeAssistant,
  item: LogbookEntry,
  domain: string | undefined,
  stateObj: HassEntity | undefined
): LogbookValue | undefined => {
  if (item.entity_id && item.state) {
    return {
      text: stateObj
        ? localizeStateMessage(hass, item.state, stateObj, domain!)
        : item.state,
      type: "state",
    };
  }
  const isAutomationRun =
    domain &&
    TRIGGER_DOMAINS.includes(domain) &&
    (item.source || hasContext(item));
  if (isAutomationRun) {
    return {
      text: hass.localize(
        domain === "script"
          ? "ui.components.logbook.script_ran"
          : "ui.components.logbook.automation_triggered"
      ),
      type: "state",
    };
  }
  if (item.message) {
    return {
      text: hasContext(item)
        ? stripEntityId(item.message, item.context_entity_id)
        : item.message,
      type: "message",
    };
  }
  return undefined;
};

// `context` is the secondary location string (device ▸ area), distinct from
// the raw `context_*` fields on LogbookEntry.
export interface LogbookItem {
  category: LogbookEntryCategory;
  glyph: LogbookGlyph;
  entityId?: string;
  name?: string;
  context?: string;
  value?: LogbookValue;
  cause?: LogbookCause;
  when: number;
}

export interface BuildLogbookItemOptions {
  scope?: LogbookScope;
  userIdToName?: Record<string, string>;
}

export const computeLogbookItem = (
  hass: HomeAssistant,
  item: LogbookEntry,
  opts: BuildLogbookItemOptions = {}
): LogbookItem => {
  const category = classifyLogbookEntry(item);
  const domain = item.entity_id ? computeDomain(item.entity_id) : item.domain;
  const currentStateObj = item.entity_id
    ? hass.states[item.entity_id]
    : undefined;
  const historicStateObj = currentStateObj
    ? createHistoricState(currentStateObj, item.state)
    : undefined;

  const display = item.entity_id
    ? entityDisplay(hass, item.entity_id, opts.scope)
    : undefined;

  return {
    category,
    glyph: computeLogbookGlyph(item, category, historicStateObj, domain),
    entityId: item.entity_id,
    name: display?.primary ?? item.name,
    context: display?.secondary,
    value: computeLogbookValue(hass, item, domain, historicStateObj),
    cause: computeLogbookCause(hass, item, opts.userIdToName ?? {}),
    when: item.when * 1000,
  };
};
