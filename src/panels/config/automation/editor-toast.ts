import { consume } from "@lit/context";
import type { LitElement } from "lit";
import { state } from "lit/decorators";
import { closestWithProperty } from "../../../common/dom/ancestors-with-property";
import type { DirtyStateContext } from "../../../data/context/dirty-state";
import { dirtyStateContext } from "../../../data/context/dirty-state";
import type { ShowToastParams } from "../../../managers/notification-manager";
import { showToast } from "../../../util/toast";

export const EDITOR_SAVE_FAB_TOAST_BOTTOM_OFFSET = 60;

/**
 * Mixin that consumes `dirtyStateContext` and exposes `editorDirty` for use
 * in determining toast offset positioning.
 */
export const EditorToastDirtyConsumerMixin = <
  Base extends abstract new (...args: any[]) => LitElement,
>(
  superClass: Base
) => {
  abstract class EditorToastDirtyConsumer extends superClass {
    @state()
    @consume({ context: dirtyStateContext, subscribe: true })
    private _dirtyCtx?: DirtyStateContext;

    protected get editorDirty(): boolean {
      return Boolean(this._dirtyCtx?.isDirty);
    }

    protected showEditorToast(params: ShowToastParams): void {
      const offset = this.editorDirty
        ? EDITOR_SAVE_FAB_TOAST_BOTTOM_OFFSET
        : undefined;
      showToast(this, {
        ...params,
        ...(offset !== undefined ? { bottomOffset: offset } : {}),
        dismissable: true,
      });
    }
  }
  return EditorToastDirtyConsumer as unknown as Base &
    (abstract new (...args: any[]) => {
      editorDirty: boolean;
      showEditorToast(params: ShowToastParams): void;
    });
};

/**
 * Standalone function for callers that haven't adopted `EditorToastDirtyConsumerMixin`.
 * Falls back to DOM traversal for dirty detection.
 * @deprecated Use `EditorToastDirtyConsumerMixin` instead.
 */
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

/** @deprecated Use `EditorToastDirtyConsumerMixin` to consume dirty state from context. */
function editorSaveFabVisibleFrom(el: HTMLElement): boolean {
  if (
    el.localName === "ha-automation-editor" ||
    el.localName === "ha-script-editor"
  ) {
    return Boolean((el as { dirty?: boolean }).dirty);
  }
  const holder = closestWithProperty(el, "dirty", false) as
    | (HTMLElement & { dirty?: boolean })
    | null;
  return Boolean(holder?.dirty);
}
