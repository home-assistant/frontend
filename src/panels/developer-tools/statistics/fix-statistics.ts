import type { StatisticsValidationResult } from "../../../data/recorder";
import { showFixStatisticsDialog } from "./show-dialog-statistics-fix";
import { showFixStatisticsUnitsChangedDialog } from "./show-dialog-statistics-fix-units-changed";

export const fixStatisticsIssue = async (
  element: HTMLElement,
  issue: StatisticsValidationResult
) => {
  if (issue.type === "units_changed") {
    return showFixStatisticsUnitsChangedDialog(element, {
      issue,
    });
  }
  return showFixStatisticsDialog(element, {
    issue,
  });
};
