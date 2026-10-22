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
import {
  getAtPath,
  getParentPath,
  insertAtPath,
  setAtPath,
} from "./lovelace-path";

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

export interface PasteCardParams {
  path: LovelacePath;
  config: LovelaceCardConfig;
  replace?: boolean;
  inheritViewLayout?: boolean;
}

export async function performPasteCard(
  localize: LocalizeFunc,
  lovelace: Lovelace,
  { path, config, replace, inheritViewLayout }: PasteCardParams
): Promise<void> {
  lovelace.showToast({ id: LOVELACE_EDIT_TOAST_ID, message: "", duration: 0 });
  try {
    const index = path[path.length - 1];
    if (typeof index !== "number") {
      throw new Error("Paste target is not a card");
    }
    const card = deepClone(config);
    if (inheritViewLayout) {
      const target = getAtPath<LovelaceCardConfig>(lovelace.config, path);
      if (target?.view_layout === undefined) {
        delete card.view_layout;
      } else {
        card.view_layout = deepClone(target.view_layout);
      }
    }
    await lovelace.saveConfig(
      replace
        ? setAtPath(lovelace.config, path, card)
        : insertAtPath(
            lovelace.config,
            [...getParentPath(path), index + 1],
            card
          )
    );
  } catch (_err: unknown) {
    lovelace.showToast({
      id: LOVELACE_EDIT_TOAST_ID,
      message: localize("ui.panel.lovelace.editor.edit_card.paste_error"),
    });
    return;
  }
  if (replace) {
    lovelace.showToast({
      id: LOVELACE_EDIT_TOAST_ID,
      message: localize("ui.panel.lovelace.editor.edit_card.replaced"),
      duration: 8000,
      action: {
        action: () => fireEvent(window, "undo-change"),
        text: localize("ui.common.undo"),
      },
    });
  }
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
