import type { StatisticsValidationResult } from "../../../data/recorder";
import {
  STATISTIC_TYPES,
  updateStatisticsIssues,
} from "../../../data/recorder";
import {
  fetchRepairsIssueData,
  type RepairsIssue,
  UPDATE_REPORT_ISSUE_ID,
} from "../../../data/repairs";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showRepairsFlowDialog } from "../../../dialogs/repairs-flow/show-dialog-repair-flow";
import type { HomeAssistant } from "../../../types";
import { showVacuumSegmentMappingDialog } from "../entities/dialogs/show-dialog-vacuum-segment-mapping";
import { fixStatisticsIssue } from "../tools/statistics/fix-statistics";
import { showRepairsIssueDialog } from "./show-repair-issue-dialog";
import { showUpdateReportDialog } from "./show-update-report-dialog";

export const openRepairsIssue = async (
  element: HTMLElement,
  hass: Pick<
    HomeAssistant,
    "connection" | "callWS" | "loadFragmentTranslation"
  >,
  issue: RepairsIssue
): Promise<void> => {
  if (
    issue.domain === "repairs" &&
    issue.translation_key === UPDATE_REPORT_ISSUE_ID
  ) {
    showUpdateReportDialog(element);
  } else if (issue.is_fixable) {
    showRepairsFlowDialog(element, issue);
  } else if (
    issue.domain === "homeassistant" &&
    issue.translation_key === "config_entry_reauth"
  ) {
    const data = await fetchRepairsIssueData(
      hass.connection,
      issue.domain,
      issue.issue_id
    );
    if (data.issue_data && "flow_id" in data.issue_data) {
      showConfigFlowDialog(element, {
        continueFlowId: data.issue_data.flow_id as string,
      });
    }
  } else if (
    issue.domain === "vacuum" &&
    issue.translation_key === "segments_changed"
  ) {
    const data = await fetchRepairsIssueData(
      hass.connection,
      issue.domain,
      issue.issue_id
    );
    if (
      data.issue_data &&
      "entity_id" in data.issue_data &&
      typeof data.issue_data.entity_id === "string"
    ) {
      showVacuumSegmentMappingDialog(element, {
        entityId: data.issue_data.entity_id,
      });
    }
  } else if (
    issue.domain === "sensor" &&
    issue.translation_key &&
    STATISTIC_TYPES.includes(issue.translation_key as any)
  ) {
    hass.loadFragmentTranslation("config");
    const data = await fetchRepairsIssueData(
      hass.connection,
      issue.domain,
      issue.issue_id
    );
    if (data.issue_data && "issue_type" in data.issue_data) {
      await fixStatisticsIssue(element, {
        type: data.issue_data.issue_type as StatisticsValidationResult["type"],
        data: data.issue_data as any,
      });
      updateStatisticsIssues(hass);
    }
  } else {
    showRepairsIssueDialog(element, {
      issue,
    });
  }
};
