import type { Connection } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";
import type { Store } from "home-assistant-js-websocket/dist/store";
import { debounce } from "../common/util/debounce";
import type { HomeAssistant, HomeAssistantApi } from "../types";
import type { ConfigEntry } from "./config_entries";
import type { DataEntryFlowStep } from "./data_entry_flow";

export interface RepairsIssue {
  domain: string;
  issue_domain: string | null;
  issue_id: string;
  is_fixable: boolean;
  severity: "error" | "warning" | "critical";
  breaks_in_ha_version: string | null;
  ignored: boolean;
  created: string;
  dismissed_version: string | null;
  learn_more_url: string | null;
  translation_key: string | null;
  translation_placeholders: Record<string, string> | null;
}

export const severitySort = {
  critical: 1,
  error: 2,
  warning: 3,
};

export const fetchRepairsIssues = (conn: Connection) =>
  conn.sendMessagePromise<{ issues: RepairsIssue[] }>({
    type: "repairs/list_issues",
  });

export const fetchRepairsIssueData = (
  conn: Connection,
  domain: string,
  issue_id: string
) =>
  conn.sendMessagePromise<{ issue_data: Record<string, any> | null }>({
    type: "repairs/get_issue_data",
    domain,
    issue_id,
  });

export const ignoreRepairsIssue = async (
  hass: HomeAssistant,
  issue: RepairsIssue,
  ignore: boolean
) =>
  hass.callWS<undefined>({
    type: "repairs/ignore_issue",
    issue_id: issue.issue_id,
    domain: issue.domain,
    ignore,
  });

export const createRepairsFlow = (
  hass: HomeAssistant,
  handler: string,
  issue_id: string
) =>
  hass.callApi<DataEntryFlowStep>("POST", "repairs/issues/fix", {
    handler,
    issue_id,
  });

export const fetchRepairsFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi<DataEntryFlowStep>("GET", `repairs/issues/fix/${flowId}`);

export const handleRepairsFlowStep = (
  hass: HomeAssistant,
  flowId: string,
  data: Record<string, any>
) =>
  hass.callApi<DataEntryFlowStep>("POST", `repairs/issues/fix/${flowId}`, data);

export const deleteRepairsFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi("DELETE", `repairs/issues/fix/${flowId}`);

const subscribeRepairsIssueUpdates = (
  conn: Connection,
  store: Store<{ issues: RepairsIssue[] }>
) =>
  conn.subscribeEvents(
    debounce(
      () =>
        fetchRepairsIssues(conn).then((repairs) =>
          store.setState(repairs, true)
        ),
      500,
      true
    ),
    "repairs_issue_registry_updated"
  );

export const subscribeRepairsIssueRegistry = (
  conn: Connection,
  onChange: (repairs: { issues: RepairsIssue[] }) => void
) =>
  createCollection<{ issues: RepairsIssue[] }>(
    "_repairsIssueRegistry",
    fetchRepairsIssues,
    subscribeRepairsIssueUpdates,
    conn,
    onChange
  );

export interface UpdateReportConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
  // null when the config entry was removed
  state: ConfigEntry["state"] | null;
  reason: string | null;
  error_reason_translation_domain: string | null;
  error_reason_translation_key: string | null;
  error_reason_translation_placeholders: Record<string, string> | null;
}

export interface UpdateReportEntity {
  entity_id: string;
  platform: string;
}

// Automations and scripts that still reference the old entity_id
export interface UpdateReportReferencedEntity extends UpdateReportEntity {
  automations: string[];
  scripts: string[];
}

export interface UpdateReportUnavailableEntity extends UpdateReportEntity {
  // null when the entity has no state
  state: "unavailable" | "unknown" | null;
}

export interface UpdateReportRenamedEntity extends UpdateReportReferencedEntity {
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
  created: string;
  config_entries: UpdateReportConfigEntry[];
  entities_unavailable: UpdateReportUnavailableEntity[];
  entities_renamed: UpdateReportRenamedEntity[];
  entities_removed: UpdateReportReferencedEntity[];
  // Without issues that have a breaks_in_ha_version
  issues: UpdateReportIssue[];
  // Only breaking changes that are new since the snapshot
  upcoming: UpdateReportUpcomingIssue[];
}

export const UPDATE_REPORT_ISSUE_ID = "update_report";

export const fetchUpdateReport = (api: HomeAssistantApi) =>
  api.callWS<UpdateReport | null>({ type: "repairs/update_report" });

export const dismissUpdateReport = (api: HomeAssistantApi) =>
  api.callWS<null>({ type: "repairs/update_report/dismiss" });

export interface UpdateReportAffected {
  // automation or script that still references the old entity_id
  entity_id: string;
  old_entity_id: string;
  new_entity_id: string | null;
}

const referencingEntities = (
  entity: UpdateReportReferencedEntity,
  oldEntityId: string,
  newEntityId: string | null
): UpdateReportAffected[] =>
  [...entity.automations, ...entity.scripts].map((entityId) => ({
    entity_id: entityId,
    old_entity_id: oldEntityId,
    new_entity_id: newEntityId,
  }));

export const updateReportAffected = (
  report: UpdateReport
): UpdateReportAffected[] =>
  [
    ...report.entities_removed.flatMap((entity) =>
      referencingEntities(entity, entity.entity_id, null)
    ),
    ...report.entities_renamed.flatMap((entity) =>
      referencingEntities(entity, entity.old_entity_id, entity.entity_id)
    ),
  ].sort(
    (a, b) =>
      a.entity_id.localeCompare(b.entity_id) ||
      a.old_entity_id.localeCompare(b.old_entity_id)
  );
