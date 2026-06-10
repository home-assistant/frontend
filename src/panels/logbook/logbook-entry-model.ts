import { mdiFlash, mdiPuzzle, mdiRobot, mdiScriptText } from "@mdi/js";
import { isSameDay } from "date-fns";
import type { HassEntity } from "home-assistant-js-websocket";
import type { LocalizeKeys } from "../../common/translations/localize";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeEntityNameList } from "../../common/entity/compute_entity_name_display";
import { computeObjectId } from "../../common/entity/compute_object_id";
import { stateColorCss } from "../../common/entity/state_color";
import { computeRTL } from "../../common/util/compute_rtl";
import { domainToName } from "../../data/integration";
import type { LogbookEntry } from "../../data/logbook";
import { parseTriggerSource } from "../../data/logbook";
import type { HomeAssistant } from "../../types";

export type LogbookEntryCategory = "entity" | "automation" | "integration";

export const TRIGGER_DOMAINS = ["automation", "script"];

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

// Localize a trigger's type name. Integration-provided triggers are namespaced
// (e.g. "sensor.temperature_changed") and come from backend translations;
// built-in types reuse the automation editor labels via [%key] in our own,
// always-loaded namespace. Falls back to the raw key.
const localizeTriggerName = (hass: HomeAssistant, trigger: string): string => {
  if (trigger.includes(".")) {
    return (
      hass.localize(
        `component.${computeDomain(trigger)}.triggers.${computeObjectId(trigger)}.name`
      ) || trigger
    );
  }
  return (
    hass.localize(
      `ui.components.logbook.trigger_type.${trigger}` as LocalizeKeys
    ) || trigger
  );
};

// Build the cause of a self-triggered automation/script: the trigger's own
// icon + name (its alias if the user named it, else the localized type) —
// shared by the structured and the legacy code paths.
const triggerCause = (
  hass: HomeAssistant,
  platform: string | undefined,
  alias?: string
): LogbookCause | undefined => {
  if (alias) {
    return { triggerPlatform: platform, name: alias };
  }
  if (platform) {
    return {
      triggerPlatform: platform,
      name: localizeTriggerName(hass, platform),
    };
  }
  return undefined;
};

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
    !hasContext(item)
  ) {
    let cause: LogbookCause | undefined;
    if (item.trigger) {
      cause = triggerCause(hass, item.trigger.trigger, item.trigger.alias);
    } else if (item.source) {
      // Legacy backend: parse the English `source` phrase. Removable once the
      // structured trigger is guaranteed (min backend version).
      const parsed = parseTriggerSource(item.source);
      cause = triggerCause(hass, parsed.platform);
    }
    if (cause) {
      return cause;
    }
  }

  if (item.context_name) {
    return item.context_domain
      ? { brandDomain: item.context_domain, name: item.context_name }
      : { iconPath: mdiPuzzle, name: item.context_name };
  }

  return undefined;
};
