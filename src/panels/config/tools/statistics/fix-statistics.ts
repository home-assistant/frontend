import type { StatisticsValidationResult } from "../../../../data/recorder";
import { showFixStatisticsDialog } from "./show-dialog-statistics-fix";
import { showFixStatisticsUnitsChangedDialog } from "./show-dialog-statistics-fix-units-changed";

const FIX_ISSUES_ORDER: Record<StatisticsValidationResult["type"], number> = {
  no_state: 0,
  entity_no_longer_recorded: 1,
  entity_not_recorded: 1,
  state_class_removed: 2,
  units_changed: 3,
  mean_type_changed: 4,
};

export const FIXABLE_ISSUES: StatisticsValidationResult["type"][] = [
  "no_state",
  "entity_no_longer_recorded",
  "state_class_removed",
  "units_changed",
  "mean_type_changed",
];

export const sortStatisticsIssues = (issues: StatisticsValidationResult[]) =>
  [...issues].sort(
    (itemA, itemB) =>
      (FIX_ISSUES_ORDER[itemA.type] ?? 99) -
      (FIX_ISSUES_ORDER[itemB.type] ?? 99)
  );

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
