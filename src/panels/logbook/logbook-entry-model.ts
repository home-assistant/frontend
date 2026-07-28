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
import type { TraceContexts } from "../../data/trace";
import type { HomeAssistant } from "../../types";

export type LogbookEntryCategory = "entity" | "automation" | "integration";

const TRIGGER_DOMAINS = ["automation", "script"];

const stripEntityId = (message: string, entityId?: string) =>
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

// How much naming detail an entity row shows, from least to most. The value is
// the broadest part shown: `none` (name hidden), `entity`, `device` (device ▸
// entity), `area` (area ▸ device ▸ entity).
export type LogbookNameDetail = "none" | "entity" | "device" | "area";

export interface EntityDisplay {
  primary?: string;
  secondary?: string;
}

export const entityDisplay = (
  hass: HomeAssistant,
  entityId: string,
  nameDetail?: LogbookNameDetail
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
  switch (nameDetail) {
    case "none":
    case "entity":
      parts = [];
      break;
    case "device":
      parts = [deviceQualifier];
      break;
    case "area":
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

const hasContext = (item: LogbookEntry) =>
  item.context_event_type || item.context_state || item.context_message;

export const sameDay = (a?: LogbookEntry, b?: LogbookEntry) =>
  !!a?.when && !!b?.when && isSameDay(a.when * 1000, b.when * 1000);

// Entries are sorted newest first.
export const findPreviousState = (
  entries: LogbookEntry[],
  index: number
): string | undefined => {
  const entityId = entries[index]?.entity_id;
  if (!entityId) {
    return undefined;
  }
  for (let i = index + 1; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.entity_id === entityId && entry.state !== undefined) {
      return entry.state;
    }
  }
  return undefined;
};

export const isSameLogbookEntry = (a: LogbookEntry, b: LogbookEntry) =>
  a.when === b.when &&
  a.entity_id === b.entity_id &&
  a.state === b.state &&
  a.message === b.message &&
  a.name === b.name;

// Every entry of a run shares the run's context id, so effect rows resolve
// to their cause's trace too.
export const computeTraceLink = (
  traceContexts: TraceContexts,
  contextId?: string
): string | undefined => {
  const traceContext = contextId ? traceContexts[contextId] : undefined;
  return traceContext
    ? `/config/${traceContext.domain}/trace/${traceContext.item_id}?run_id=${traceContext.run_id}`
    : undefined;
};

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
  systemUser?: boolean;
  entityId?: string;
  brandDomain?: string;
}

export const computeUserCause = (
  item: LogbookEntry,
  userIdToName: Record<string, string>,
  systemUserIds?: Set<string>
): LogbookCause | undefined => {
  const userName = item.context_user_id
    ? userIdToName[item.context_user_id]
    : undefined;
  if (!userName) {
    return undefined;
  }
  return {
    type: "user",
    name: userName,
    userId: item.context_user_id,
    systemUser: systemUserIds?.has(item.context_user_id!),
  };
};

export const computeContextCause = (
  hass: HomeAssistant,
  item: LogbookEntry
): LogbookCause | undefined => {
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

export const computeLogbookCause = (
  hass: HomeAssistant,
  item: LogbookEntry,
  userIdToName: Record<string, string>,
  systemUserIds?: Set<string>
): LogbookCause | undefined =>
  computeUserCause(item, userIdToName, systemUserIds) ??
  computeContextCause(hass, item);

export const isRunCause = (cause?: LogbookCause): boolean =>
  cause?.type === "automation" || cause?.type === "script";

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
        ? localizeStateMessage(
            hass,
            item.state,
            stateObj,
            domain!,
            item.attributes
          )
        : item.state,
      type: "state",
    };
  }
  // Core sends run rows with a raw English message; use our own label.
  const isAutomationRun = domain && TRIGGER_DOMAINS.includes(domain);
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
  nameDetail?: LogbookNameDetail;
  userIdToName?: Record<string, string>;
  systemUserIds?: Set<string>;
}

export const computeLogbookItem = (
  hass: HomeAssistant,
  entry: LogbookEntry,
  opts: BuildLogbookItemOptions = {}
): LogbookItem => {
  const category = classifyLogbookEntry(entry);
  const domain = entry.entity_id
    ? computeDomain(entry.entity_id)
    : entry.domain;
  const currentStateObj = entry.entity_id
    ? hass.states[entry.entity_id]
    : undefined;
  const historicStateObj = currentStateObj
    ? createHistoricState(currentStateObj, entry.state)
    : undefined;

  const display = entry.entity_id
    ? entityDisplay(hass, entry.entity_id, opts.nameDetail)
    : undefined;

  const userCause = computeUserCause(
    entry,
    opts.userIdToName ?? {},
    opts.systemUserIds
  );
  const contextCause = computeContextCause(hass, entry);

  return {
    category,
    glyph: computeLogbookGlyph(entry, category, historicStateObj, domain),
    entityId: entry.entity_id,
    name: display?.primary ?? entry.name,
    context: display?.secondary,
    value: computeLogbookValue(hass, entry, domain, historicStateObj),
    // A row shows the run over the user who started it; the dialog shows both.
    cause: isRunCause(contextCause)
      ? contextCause
      : (userCause ?? contextCause),
    when: entry.when * 1000,
  };
};
