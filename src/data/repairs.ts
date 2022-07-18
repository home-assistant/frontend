import type { HomeAssistant } from "../types";

export interface RepairsIssue {
  domain: string;
  issue_id: string;
  active: boolean;
  is_fixable: boolean;
  severity?: "error" | "warning" | "critical";
  breaks_in_ha_version?: string;
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

export const fixRepairsIssue = (hass: HomeAssistant, issue: RepairsIssue) =>
  hass.callApi("POST", "resolution_center/issues/fix", {
    handler: issue.domain,
    issue_id: issue.issue_id,
  });
