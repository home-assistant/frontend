import { mdiFlash, mdiPuzzle, mdiRobot, mdiScriptText } from "@mdi/js";
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
  // A state change always wins, even for automation/script entities (e.g.
  // turning an automation on/off is an entity state change, not a run).
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
  // Undefined when the entity no longer exists.
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

  // The device is context only when the entity has its own name; otherwise the
  // device name *is* the subject and showing it again would duplicate it.
  const deviceContext = entityName ? deviceName : undefined;

  let parts: (string | undefined)[];
  switch (scope) {
    case "entity":
    case "device":
      parts = [];
      break;
    case "area":
      parts = [deviceContext];
      break;
    default:
      parts = [areaName, deviceContext];
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

// Dashboard state color for entity nodes; unavailable is flagged with an orange
// badge by the row, not here.
export const nodeColor = (
  category: LogbookEntryCategory,
  historicStateObj: HassEntity | undefined
): string | undefined => {
  if (category !== "entity" || !historicStateObj) {
    return undefined;
  }
  return stateColorCss(historicStateObj);
};

export interface LogbookCause {
  name: string;
  userId?: string;
  iconPath?: string;
  triggerPlatform?: string;
  brandDomain?: string;
}

// Localize a built-in trigger platform (state, time, …) via the automation
// editor labels reused in our always-loaded namespace. Falls back to the key.
const localizeTriggerName = (hass: HomeAssistant, platform: string): string =>
  hass.localize(
    `ui.components.logbook.trigger_type.${platform}` as LocalizeKeys
  ) || platform;

const localizeServiceName = (
  hass: HomeAssistant,
  domain: string,
  service: string
): string =>
  hass.localize(
    `component.${domain}.services.${service}.name` as LocalizeKeys
  ) ||
  hass.services[domain]?.[service]?.name ||
  service;

// Who/what caused an entry: a user, an automation/script, a triggering entity,
// or an integration. Returns the actor's glyph/avatar + name.
export const resolveLogbookCause = (
  hass: HomeAssistant,
  item: LogbookEntry,
  userIdToName: Record<string, string>
): LogbookCause | undefined => {
  const userName = item.context_user_id
    ? userIdToName[item.context_user_id]
    : undefined;
  if (userName) {
    return { name: userName, userId: item.context_user_id };
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
        iconPath:
          item.context_event_type === "script_started"
            ? mdiScriptText
            : mdiRobot,
        name,
      };
    }
  }

  if (item.context_event_type === "call_service" && item.context_domain) {
    const serviceName = item.context_service
      ? localizeServiceName(hass, item.context_domain, item.context_service)
      : undefined;
    const domainName = domainToName(hass.localize, item.context_domain);
    return {
      brandDomain: item.context_domain,
      name: serviceName ? `${domainName}: ${serviceName}` : domainName,
    };
  }

  if (item.context_state && item.context_entity_id) {
    const name =
      entityDisplay(hass, item.context_entity_id).primary ??
      item.context_entity_id_name;
    if (name) {
      return { name, iconPath: mdiFlash };
    }
  }

  if (
    item.domain &&
    TRIGGER_DOMAINS.includes(item.domain) &&
    !hasContext(item) &&
    item.source
  ) {
    const { platform } = parseTriggerSource(item.source);
    if (platform) {
      return {
        triggerPlatform: platform,
        name: localizeTriggerName(hass, platform),
      };
    }
  }

  if (item.context_name) {
    return item.context_domain
      ? { brandDomain: item.context_domain, name: item.context_name }
      : { iconPath: mdiPuzzle, name: item.context_name };
  }

  return undefined;
};

// The node glyph, decided by type. The component switches on `type` to render
// (state icon / robot-script / brand logo); it owns the brand URL and colors.
export type LogbookGlyph =
  | { type: "state"; stateObj: HassEntity; icon?: string }
  | { type: "automation"; script: boolean }
  | { type: "brand"; domain?: string; icon?: string };

export const resolveLogbookGlyph = (
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

// What happened. `value` reads as a state/result and gets the "name → value"
// arrow; `phrase` is a full sentence (integration message) rendered inline and
// linkified by the component.
export interface LogbookWhat {
  text: string;
  kind: "value" | "phrase";
}

const resolveLogbookWhat = (
  hass: HomeAssistant,
  item: LogbookEntry,
  domain: string | undefined,
  stateObj: HassEntity | undefined
): LogbookWhat | undefined => {
  if (item.entity_id && item.state) {
    return {
      text: stateObj
        ? localizeStateMessage(hass, item.state, stateObj, domain!)
        : item.state,
      kind: "value",
    };
  }
  // An automation/script run: self-triggered (has `source`) or started by
  // something else (has a context). Either way show the generic "Triggered"/
  // "Ran" headline; a bare logbook.log message (no source, no context) falls
  // through to render its own text.
  if (
    domain &&
    TRIGGER_DOMAINS.includes(domain) &&
    (item.source || hasContext(item))
  ) {
    return {
      text: hass.localize(
        domain === "script"
          ? "ui.components.logbook.script_ran"
          : "ui.components.logbook.automation_triggered"
      ),
      kind: "value",
    };
  }
  if (item.message) {
    return {
      text: hasContext(item)
        ? stripEntityId(item.message, item.context_entity_id)
        : item.message,
      kind: "phrase",
    };
  }
  return undefined;
};

// The type-agnostic view-model: name / what / context / cause + the node glyph,
// derived once per entry so the display just arranges these fields by style.
export interface LogbookItem {
  category: LogbookEntryCategory;
  glyph: LogbookGlyph;
  entityId?: string;
  name?: string;
  context?: string;
  what?: LogbookWhat;
  cause?: LogbookCause;
  when: number; // ms timestamp
}

export interface BuildLogbookItemOptions {
  scope?: LogbookScope;
  userIdToName?: Record<string, string>;
}

export const buildLogbookItem = (
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

  // Context (and the registry-resolved name) only for entity rows — an
  // automation's configured area is noise.
  const display =
    category === "entity" && item.entity_id
      ? entityDisplay(hass, item.entity_id, opts.scope)
      : undefined;

  return {
    category,
    glyph: resolveLogbookGlyph(item, category, historicStateObj, domain),
    entityId: item.entity_id,
    name: display?.primary ?? item.name,
    context: display?.secondary,
    what: resolveLogbookWhat(hass, item, domain, historicStateObj),
    cause: resolveLogbookCause(hass, item, opts.userIdToName ?? {}),
    when: item.when * 1000,
  };
};
