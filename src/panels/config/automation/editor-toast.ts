import { closestWithProperty } from "../../../common/dom/ancestors-with-property";
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
