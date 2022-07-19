import type { HomeAssistant } from "../types";
import { DataEntryFlowStep } from "./data_entry_flow";

export interface RepairsIssue {
  domain: string;
  issue_id: string;
  active: boolean;
  is_fixable: boolean;
  severity?: "error" | "warning" | "critical";
  breaks_in_ha_version?: string;
  ignored: boolean;
  created: string;
  dismissed_version?: string;
  learn_more_url?: string;
  translation_key?: string;
  translation_placeholders?: Record<string, string>;
}

export const fetchRepairsIssues = async (hass: HomeAssistant) =>
  hass.callWS<{ issues: RepairsIssue[] }>({
    type: "resolution_center/list_issues",
  });

export const dismissRepairsIssue = async (
  hass: HomeAssistant,
  issue: RepairsIssue
) =>
  hass.callWS<string>({
    type: "resolution_center/dismiss_issue",
    issue_id: issue.issue_id,
    domain: issue.domain,
  });

export const createRepairsFlow = (
  hass: HomeAssistant,
  handler: string,
  issue_id: string
) =>
  hass.callApi<DataEntryFlowStep>("POST", "resolution_center/issues/fix", {
    handler,
    issue_id,
  });

export const fetchRepairsFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi<DataEntryFlowStep>(
    "GET",
    `resolution_center/issues/fix/${flowId}`
  );

export const handleRepairsFlowStep = (
  hass: HomeAssistant,
  flowId: string,
  data: Record<string, any>
) =>
  hass.callApi<DataEntryFlowStep>(
    "POST",
    `resolution_center/issues/fix/${flowId}`,
    data
  );

export const deleteRepairsFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi("DELETE", `resolution_center/issues/fix/${flowId}`);
