import type { LocalizeFunc } from "../../common/translations/localize";

/**
 * The dialogs a companion app can show as a native modal of its own.
 *
 * The modal showing one is a frontend of its own, so a listed dialog has to
 * import by tag, take `standalone` and `withoutHeader` and pass both to its
 * `ha-adaptive-dialog`, and have parameters that survive JSON.
 */
export interface NativeModalDialog {
  /** Its own name, so the element is created from this list and never from the URL. */
  tag: string;
  /** The modal showing it shares no code with the one asking. */
  load: () => Promise<unknown>;
  /**
   * What the app's navigation bar is titled while the dialog loads. Only
   * dialogs asked for through `show-dialog` need one; more-info is asked for
   * through `hass-more-info`, which names the entity in the message itself.
   */
  title?: (localize: LocalizeFunc) => string;
}

export const NATIVE_MODAL_DIALOGS: Record<string, NativeModalDialog> = {
  "ha-more-info-dialog": {
    tag: "ha-more-info-dialog",
    load: () => import("../more-info/ha-more-info-dialog"),
  },
  "dialog-logbook-detail": {
    tag: "dialog-logbook-detail",
    load: () => import("../../panels/logbook/dialog-logbook-detail"),
    title: (localize) => localize("ui.dialogs.logbook_detail.title"),
  },
};
