import { fireEvent } from "../../../common/dom/fire_event";
import type { ResolutionIssue } from "../../../data/resolutions";

export interface ResolutionIssueDialogParams {
  issue: ResolutionIssue;
}

export const loadResolutionIssueDialog = () =>
  import("./dialog-resolution-issue");

export const showResolutionIssueDialog = (
  element: HTMLElement,
  resolutionIssueParams: ResolutionIssueDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-resolution-issue",
    dialogImport: loadResolutionIssueDialog,
    dialogParams: resolutionIssueParams,
  });
};
