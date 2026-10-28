import { closestWithProperty } from "../../../common/dom/ancestors-with-property";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { ShowToastParams } from "../../../managers/notification-manager";
import { showToast } from "../../../util/toast";

export const EDITOR_SAVE_FAB_TOAST_BOTTOM_OFFSET = 60;

// Editor elements that expose dirty tracking: the top-level automation/script
// editors via `isDirtyState`, and the manual editors via `dirty`.
interface DirtyStateElement extends HTMLElement {
  isDirtyState?: boolean;
  dirty?: boolean;
}

const isDirtyStateElement = (el: HTMLElement | null): el is DirtyStateElement =>
  el !== null && ("isDirtyState" in el || "dirty" in el);

function editorSaveFabVisibleFrom(el: HTMLElement): boolean {
  if (
    el.localName === "ha-automation-editor" ||
    el.localName === "ha-script-editor"
  ) {
    return isDirtyStateElement(el) && Boolean(el.isDirtyState);
  }
  const holder = closestWithProperty(el, "dirty", false);
  return isDirtyStateElement(holder) && Boolean(holder.dirty);
}

export function showEditorToast(
  el: HTMLElement,
  params: ShowToastParams
): void {
  const offset = editorSaveFabVisibleFrom(el)
    ? EDITOR_SAVE_FAB_TOAST_BOTTOM_OFFSET
    : undefined;
  showToast(el, {
    ...params,
    ...(offset !== undefined ? { bottomOffset: offset } : {}),
    dismissable: true,
  });
}

export const showReplacedToast = (el: HTMLElement, localize: LocalizeFunc) =>
  showEditorToast(el, {
    message: localize("ui.common.successfully_replaced"),
    duration: 4000,
    action: {
      text: localize("ui.common.undo"),
      action: () => {
        fireEvent(window, "undo-change");
      },
    },
  });
