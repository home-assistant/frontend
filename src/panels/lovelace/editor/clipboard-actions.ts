import deepClone from "deep-clone-simple";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { Lovelace } from "../types";
import { LOVELACE_EDIT_TOAST_ID } from "../types";
import { performDeleteBadge } from "./delete-badge";
import { performDeleteCard } from "./delete-card";
import type { LovelacePath } from "./lovelace-path";

export type ClipboardItemType = "card" | "badge";

const DELETE_FUNCTIONS = {
  card: performDeleteCard,
  badge: performDeleteBadge,
} satisfies Record<ClipboardItemType, unknown>;

export interface ClipboardActionParams<T> {
  type: ClipboardItemType;
  path: LovelacePath;
  config: T;
  setClipboard: (config: T) => void;
}

export function performCopy<T>(
  localize: LocalizeFunc,
  lovelace: Lovelace,
  { type, config, setClipboard }: ClipboardActionParams<T>
): void {
  setClipboard(deepClone(config));
  lovelace.showToast({
    id: LOVELACE_EDIT_TOAST_ID,
    message: localize(
      `ui.panel.lovelace.editor.edit_${type}.copied_to_clipboard`
    ),
  });
}

export async function performCut<T>(
  localize: LocalizeFunc,
  lovelace: Lovelace,
  { type, path, config, setClipboard }: ClipboardActionParams<T>
): Promise<void> {
  const deleted = await DELETE_FUNCTIONS[type](localize, lovelace, {
    path,
    silent: true,
  });
  // The clipboard is only replaced once the item is gone, so a failed cut
  // does not turn into a copy.
  if (!deleted) {
    return;
  }
  setClipboard(deepClone(config));
  lovelace.showToast({
    id: LOVELACE_EDIT_TOAST_ID,
    message: localize(`ui.panel.lovelace.editor.edit_${type}.cut_to_clipboard`),
    duration: 8000,
    action: {
      action: () => fireEvent(window, "undo-change"),
      text: localize("ui.common.undo"),
    },
  });
}
