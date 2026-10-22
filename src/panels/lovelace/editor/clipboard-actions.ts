import deepClone from "deep-clone-simple";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { Lovelace } from "../types";
import { LOVELACE_EDIT_TOAST_ID } from "../types";
import { performDeleteBadge } from "./delete-badge";
import { performDeleteCard } from "./delete-card";
import type { LovelacePath } from "./lovelace-path";

interface ClipboardItemConfigs {
  card: LovelaceCardConfig;
  badge: LovelaceBadgeConfig;
}

export type ClipboardItemType = keyof ClipboardItemConfigs;

type DeleteFunction = (
  localize: LocalizeFunc,
  lovelace: Lovelace,
  params: { path: LovelacePath; silent: boolean }
) => Promise<boolean>;

const DELETE_FUNCTIONS: Record<ClipboardItemType, DeleteFunction> = {
  card: performDeleteCard,
  badge: performDeleteBadge,
};

// Stops a slow cut from overwriting a newer copy or cut.
let lastVersion = 0;
const clipboardVersions = { card: 0, badge: 0 };

export interface ClipboardActionParams<K extends ClipboardItemType> {
  type: K;
  path: LovelacePath;
  config: ClipboardItemConfigs[K];
  setClipboard: (config: ClipboardItemConfigs[K]) => void;
}

export function performCopy<K extends ClipboardItemType>(
  localize: LocalizeFunc,
  lovelace: Lovelace,
  { type, config, setClipboard }: ClipboardActionParams<K>
): void {
  clipboardVersions[type] = ++lastVersion;
  setClipboard(deepClone(config));
  lovelace.showToast({
    id: LOVELACE_EDIT_TOAST_ID,
    message: localize(
      `ui.panel.lovelace.editor.edit_${type}.copied_to_clipboard`
    ),
  });
}

export async function performCut<K extends ClipboardItemType>(
  localize: LocalizeFunc,
  lovelace: Lovelace,
  { type, path, config, setClipboard }: ClipboardActionParams<K>
): Promise<void> {
  const version = ++lastVersion;
  const deleted = await DELETE_FUNCTIONS[type](localize, lovelace, {
    path,
    silent: true,
  });
  // The clipboard is only replaced once the item is gone, so a failed cut
  // does not turn into a copy.
  if (!deleted || clipboardVersions[type] > version) {
    return;
  }
  clipboardVersions[type] = version;
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
