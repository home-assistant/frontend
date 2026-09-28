import type { LocalizeFunc } from "../../common/translations/localize";
import { createNativeModalDialogUrl } from "../../common/url/native-modal-url";
import type { ShowDialogParams } from "../make-dialog-manager";
import { NATIVE_MODAL_DIALOGS } from "./native-modal-dialogs";

/** What to do with a dialog asked for on a page the app is showing in a modal. */
export type NativeModalDialogDecision =
  /** Hand it to the app, which stacks a modal of its own over this one. */
  | { action: "open"; path: string; title: string }
  /** Draw it here, after growing the modal: a half-height one would clip it. */
  | { action: "grow" };

export const decideNativeModalDialog = (
  detail: ShowDialogParams<unknown> | undefined,
  hasNativeModal: boolean,
  localize: LocalizeFunc
): NativeModalDialogDecision => {
  const tag = detail?.dialogTag;
  const dialog = tag ? NATIVE_MODAL_DIALOGS[tag] : undefined;
  // Without a title there is nothing to put in the app's bar, so the dialog is
  // drawn here instead.
  if (!tag || !dialog?.title || !hasNativeModal) {
    return { action: "grow" };
  }
  return {
    action: "open",
    path: createNativeModalDialogUrl({ tag, params: detail?.dialogParams }),
    title: dialog.title(localize),
  };
};
