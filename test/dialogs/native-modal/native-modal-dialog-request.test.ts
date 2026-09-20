import { describe, expect, it } from "vitest";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import { decideNativeModalDialog } from "../../../src/dialogs/native-modal/native-modal-dialog-request";

const localize = ((key: string) => key) as LocalizeFunc;

describe("decideNativeModalDialog", () => {
  it("hands a dialog the app can show to a modal of its own", () => {
    const decision = decideNativeModalDialog(
      {
        dialogTag: "dialog-logbook-detail",
        dialogImport: () => Promise.resolve(),
        dialogParams: { entry: { when: 1 } },
      },
      true,
      localize
    );

    expect(decision.action).toBe("open");
    expect(decision).toMatchObject({
      title: "ui.dialogs.logbook_detail.title",
    });
    expect(
      decision.action === "open" && decision.path.startsWith("/_modal#dialog=")
    ).toBe(true);
  });

  // Growing first is what keeps a half-height modal from clipping the dialog.
  it("grows the modal for a dialog it has to draw in the page", () => {
    expect(
      decideNativeModalDialog(
        {
          dialogTag: "dialog-box",
          dialogImport: () => Promise.resolve(),
          dialogParams: {},
        },
        true,
        localize
      )
    ).toEqual({ action: "grow" });
  });

  it("draws in the page when the app cannot show modals", () => {
    expect(
      decideNativeModalDialog(
        {
          dialogTag: "dialog-logbook-detail",
          dialogImport: () => Promise.resolve(),
          dialogParams: {},
        },
        false,
        localize
      )
    ).toEqual({ action: "grow" });
  });

  // More-info reaches a modal through `hass-more-info`, which names the entity
  // in the message; there is nothing to title the app's bar with here.
  it("draws in the page a hosted dialog that names itself elsewhere", () => {
    expect(
      decideNativeModalDialog(
        {
          dialogTag: "ha-more-info-dialog",
          dialogImport: () => Promise.resolve(),
          dialogParams: { entityId: "light.kitchen" },
        },
        true,
        localize
      )
    ).toEqual({ action: "grow" });
  });

  it("draws in the page when the event names no dialog", () => {
    expect(decideNativeModalDialog(undefined, true, localize)).toEqual({
      action: "grow",
    });
  });
});
