import { describe, expect, it } from "vitest";

import type { ShowDialogParams } from "../../../src/dialogs/make-dialog-manager";
import { showConfirmationDialog } from "../../../src/dialogs/generic/show-dialog-box";

// The unsaved-changes guard needs its prompt to add no history entry, or the
// entries a pop left are truncated before declining can restore them. Losing
// this pass-through breaks that silently.
const firedDetail = (params: Parameters<typeof showConfirmationDialog>[1]) => {
  const element = document.createElement("div");
  let detail: ShowDialogParams<unknown> | undefined;
  element.addEventListener("show-dialog", (ev) => {
    detail = (ev as CustomEvent<ShowDialogParams<unknown>>).detail;
  });
  showConfirmationDialog(element, params);
  return detail;
};

describe("showConfirmationDialog", () => {
  it("passes addHistory through to the dialog manager", () => {
    expect(firedDetail({ text: "x", addHistory: false })?.addHistory).toBe(
      false
    );
  });

  it("leaves addHistory unset when the caller does not ask", () => {
    // The manager then defaults it to true, so back closes the dialog.
    expect(firedDetail({ text: "x" })?.addHistory).toBeUndefined();
  });
});
