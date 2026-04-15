import { closestWithProperty } from "../../../common/dom/ancestors-with-property";
import type { ShowToastParams } from "../../../managers/notification-manager";
import { showToast } from "../../../util/toast";

export const AUTOMATION_SAVE_FAB_TOAST_BOTTOM_OFFSET = 60;

function automationEditorSaveFabVisibleFrom(el: HTMLElement): boolean {
  if (el.localName === "ha-automation-editor") {
    return Boolean((el as { dirty?: boolean }).dirty);
  }
  const holder = closestWithProperty(el, "dirty", false) as
    | (HTMLElement & { dirty?: boolean })
    | null;
  return Boolean(holder?.dirty);
}

export function showAutomationEditorToast(
  el: HTMLElement,
  params: ShowToastParams
): void {
  const offset = automationEditorSaveFabVisibleFrom(el)
    ? AUTOMATION_SAVE_FAB_TOAST_BOTTOM_OFFSET
    : undefined;
  showToast(el, {
    ...params,
    ...(offset !== undefined ? { bottomOffset: offset } : {}),
  });
}
