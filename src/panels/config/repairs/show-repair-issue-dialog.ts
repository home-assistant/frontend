import { fireEvent } from "../../../common/dom/fire_event";
import type { RepairsIssue } from "../../../data/repairs";

export interface RepairsIssueDialogParams {
  issue: RepairsIssue;
  dialogClosedCallback?: () => void;
}

export const loadRepairsIssueDialog = () => import("./dialog-repairs-issue");

export const showRepairsIssueDialog = (
  element: HTMLElement,
  repairsIssueParams: RepairsIssueDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-repairs-issue",
    dialogImport: loadRepairsIssueDialog,
    dialogParams: repairsIssueParams,
  });
};
