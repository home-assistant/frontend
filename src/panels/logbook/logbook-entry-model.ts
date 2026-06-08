import {
  mdiClockOutline,
  mdiFlash,
  mdiPuzzle,
  mdiRobot,
  mdiScriptText,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { computeEntityNameList } from "../../common/entity/compute_entity_name_display";
import { stateColorCss } from "../../common/entity/state_color";
import { computeRTL } from "../../common/util/compute_rtl";
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
  !!a?.when &&
  !!b?.when &&
  new Date(a.when * 1000).toDateString() ===
    new Date(b.when * 1000).toDateString();

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
  stateObj?: HassEntity;
  iconPath?: string;
}

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

  // Triggering entity's own icon — reads differently from an automation.
  if (item.context_state && item.context_entity_id) {
    const name =
      entityDisplay(hass, item.context_entity_id).primary ??
      item.context_entity_id_name;
    if (name) {
      return { name, stateObj: hass.states[item.context_entity_id] };
    }
  }

  // A self-triggered automation/script: reconstruct from its English source.
  // Temporary until the backend sends the trigger structurally.
  if (
    item.domain &&
    TRIGGER_DOMAINS.includes(item.domain) &&
    item.source &&
    !hasContext(item)
  ) {
    const trigger = parseTriggerSource(item.source);
    if (trigger.entityId) {
      const stateObj = hass.states[trigger.entityId];
      if (stateObj) {
        const name =
          entityDisplay(hass, trigger.entityId).primary ?? trigger.entityId;
        return { name, stateObj };
      }
    }
    if (trigger.platform) {
      const isTime =
        trigger.platform === "time" || trigger.platform === "time_pattern";
      return {
        iconPath: isTime ? mdiClockOutline : mdiFlash,
        name: hass.localize(
          `ui.components.logbook.trigger_type.${trigger.platform}`
        ),
      };
    }
  }

  if (item.context_name) {
    return { iconPath: mdiPuzzle, name: item.context_name };
  }

  return undefined;
};
