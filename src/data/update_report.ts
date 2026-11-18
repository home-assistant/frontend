import type { HassEntities } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";
import type { RepairsIssue } from "./repairs";
import { HOME_ASSISTANT_CORE_TITLE } from "./update";

export interface UpdateReportIssue {
  domain: string;
  issue_id: string;
  severity: RepairsIssue["severity"];
}

export type UpdateReportSeverity = "error" | "warning";

export interface UpdateReportSummary {
  id: string;
  from_version: string;
  to_version: string;
  update_started: string;
  // null while pending
  created: string | null;
  // Startup has not settled yet, the report is a live diff
  pending: boolean;
  // null when nothing needs attention
  severity: UpdateReportSeverity | null;
  automatic: boolean;
  // Number of new repairs since the update
  issues: number;
}

export interface UpdateReport extends Omit<UpdateReportSummary, "issues"> {
  backup: boolean;
  // null until Home Assistant started on the new version
  started: string | null;
  issues: UpdateReportIssue[];
}

// The report is a live diff until startup has settled
export const UPDATE_REPORT_PENDING_REFRESH_INTERVAL = 30000;

// Newest first
export const fetchUpdateReports = (
  hass: Pick<HomeAssistant, "callWS">,
  entityId: string
) =>
  hass.callWS<UpdateReportSummary[]>({
    type: "update/reports",
    entity_id: entityId,
  });

export const fetchUpdateReport = (
  hass: Pick<HomeAssistant, "callWS">,
  entityId: string,
  reportId: string
) =>
  hass.callWS<UpdateReport | null>({
    type: "update/report",
    entity_id: entityId,
    report_id: reportId,
  });

export const updateReportPath = (entityId: string, reportId: string) =>
  `/config/updates/details/${entityId}/report/${encodeURIComponent(reportId)}`;

// Release notes of an installed version are not available through the update entity
export const updateReportReleaseUrl = (version: string) =>
  `https://github.com/home-assistant/core/releases/tag/${encodeURIComponent(version)}`;

// Whole seconds between the update and the start on the new version
export const updateReportStartupSeconds = (
  report: Pick<UpdateReport, "update_started" | "started">
): number | undefined =>
  report.started
    ? Math.max(
        0,
        Math.round(
          (new Date(report.started).getTime() -
            new Date(report.update_started).getTime()) /
            1000
        )
      )
    : undefined;

// Only the core update has a report for now
export const findCoreUpdateEntityId = (
  states: HassEntities
): string | undefined =>
  Object.values(states).find(
    (stateObj) =>
      stateObj.entity_id.startsWith("update.") &&
      stateObj.attributes.title === HOME_ASSISTANT_CORE_TITLE
  )?.entity_id;
