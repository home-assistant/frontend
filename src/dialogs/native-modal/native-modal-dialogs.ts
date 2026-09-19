import type { LocalizeFunc } from "../../common/translations/localize";

/**
 * The dialogs a companion app may show in a modal of its own, stacked over the
 * one that asked for it.
 *
 * The modal showing one is a frontend of its own, so a listed dialog has to
 * import by tag, take `standalone` and `withoutHeader` and pass both to its
 * `ha-adaptive-dialog`, and have parameters that survive JSON.
 */
export interface NativeModalDialog {
  /** The modal showing it shares no code with the one asking. */
  load: () => Promise<unknown>;
  /** What the app's navigation bar is titled while the dialog loads. */
  title: (localize: LocalizeFunc) => string;
}

export const NATIVE_MODAL_DIALOGS: Record<string, NativeModalDialog> = {
  "dialog-logbook-detail": {
    load: () => import("../../panels/logbook/dialog-logbook-detail"),
    title: (localize) => localize("ui.dialogs.logbook_detail.title"),
  },
};

export const isNativeModalDialog = (tag: string): boolean =>
  tag in NATIVE_MODAL_DIALOGS;
