/**
 * The dialogs a companion app may show in a modal of its own, stacked over the
 * one that asked for it, the way a native app stacks its screens.
 *
 * A dialog opened the ordinary way inside a native modal is drawn in that
 * modal's web view: its scrim dims only the page, leaving the app's own
 * navigation bar lit above it, and it brings a second set of chrome. Handing it
 * to the app instead gives one surface per thing, as the platform does it.
 *
 * Only dialogs listed here can be handed over. The modal showing one is a
 * frontend of its own, so a dialog has to import by tag, take `standalone` and
 * `withoutHeader` and pass both to its `ha-adaptive-dialog`, and have
 * parameters that survive a trip through the URL.
 */
export interface NativeModalDialog {
  /** Imported by the modal that shows it, which shares no code with the one asking. */
  load: () => Promise<unknown>;
  /** What the app's navigation bar is titled while the dialog loads. */
  title: (localize: (key: string) => string) => string;
}

export const NATIVE_MODAL_DIALOGS: Record<string, NativeModalDialog> = {
  "dialog-logbook-detail": {
    load: () => import("../../panels/logbook/dialog-logbook-detail"),
    title: (localize) => localize("ui.dialogs.logbook_detail.title"),
  },
};

export const isNativeModalDialog = (tag: string): boolean =>
  tag in NATIVE_MODAL_DIALOGS;
