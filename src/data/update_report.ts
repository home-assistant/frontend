import type { HassEntities } from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import type { HomeAssistant } from "../types";
import type { ConfigEntry } from "./config_entries";
import { HOME_ASSISTANT_CORE_TITLE } from "./update";

export interface UpdateReportReference {
  entity_id: string;
  id: string | null;
  name: string | null;
}

export interface UpdateReportConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
  // null when the config entry was removed
  state: ConfigEntry["state"] | null;
  translation_domain: string | null;
  translation_key: string | null;
  translation_placeholders: Record<string, string> | null;
}

export interface UpdateReportUnavailableEntity {
  entity_id: string;
  platform: string;
  // null when the entity has no state anymore
  state: "unavailable" | "unknown" | null;
}

export interface UpdateReportRemovedEntity {
  entity_id: string;
  platform: string;
  automations: UpdateReportReference[];
  scripts: UpdateReportReference[];
}

export interface UpdateReportRenamedEntity extends UpdateReportRemovedEntity {
  old_entity_id: string;
}

export interface UpdateReportIssue {
  domain: string;
  issue_id: string;
}

export interface UpdateReportUpcomingIssue extends UpdateReportIssue {
  issue_domain: string | null;
  breaks_in_ha_version: string;
  dismissed: boolean;
}

export interface UpdateReport {
  from_version: string;
  to_version: string;
  // null while pending
  created: string | null;
  // Startup has not settled yet, the report is a live diff
  pending: boolean;
  config_entries: UpdateReportConfigEntry[];
  entities_unavailable: UpdateReportUnavailableEntity[];
  entities_renamed: UpdateReportRenamedEntity[];
  entities_removed: UpdateReportRemovedEntity[];
  issues: UpdateReportIssue[];
  upcoming: UpdateReportUpcomingIssue[];
}

export const fetchUpdateReport = (
  hass: Pick<HomeAssistant, "callWS">,
  entityId: string
) =>
  hass.callWS<UpdateReport | null>({
    type: "update/report",
    entity_id: entityId,
  });

// Only the core update has a report for now
export const findCoreUpdateEntityId = (
  states: HassEntities
): string | undefined =>
  Object.values(states).find(
    (stateObj) =>
      stateObj.entity_id.startsWith("update.") &&
      stateObj.attributes.title === HOME_ASSISTANT_CORE_TITLE
  )?.entity_id;

// Upcoming breaking changes are not something that got worse
export const updateReportWorseCount = (report: UpdateReport): number =>
  report.config_entries.length +
  report.entities_unavailable.length +
  report.entities_renamed.length +
  report.entities_removed.length +
  report.issues.length;

export const updateReportReferences = (
  entity: UpdateReportRemovedEntity
): UpdateReportReference[] => [...entity.automations, ...entity.scripts];

export const updateReportReferencePath = (
  reference: UpdateReportReference
): string =>
  reference.id
    ? `/config/${computeDomain(reference.entity_id)}/edit/${encodeURIComponent(reference.id)}`
    : `/config/${computeDomain(reference.entity_id)}/show/${encodeURIComponent(
        reference.entity_id
      )}`;
