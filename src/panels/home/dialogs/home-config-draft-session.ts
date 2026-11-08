import { deepEqual } from "../../../common/util/deep-equal";
import {
  resolveShortcutItems,
  type ShortcutItem,
} from "../../../data/home_shortcuts";
import type { EditorState } from "./home-config-editor-state";

const stripUndefined = <T extends object>(item: T): T =>
  Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined)
  ) as T;

const normalizeShortcuts = (items: ShortcutItem[]): ShortcutItem[] =>
  resolveShortcutItems(items).map(stripUndefined);

/**
 * Comparison-only form of an editor state: shortcuts are resolved the way
 * they render (so `[]` matches the full default list) and stripped of
 * `undefined` keys (e.g. `hidden` after hiding then showing again). Never
 * persist the result.
 */
const normalizeEditorState = (state: EditorState): EditorState => ({
  ...state,
  shortcuts: normalizeShortcuts(state.shortcuts),
});

/** Content equality of two editor states, ignoring shortcut shape only. */
export const editorStatesEqual = (a: EditorState, b: EditorState): boolean =>
  deepEqual(normalizeEditorState(a), normalizeEditorState(b));

/**
 * Immutable draft tracker for the home dashboard editor. Every edit returns a
 * new instance, so Lit's reference-based reactivity picks it up, and bumps
 * `generation`, which the dialog's updated() uses to push the preview only
 * when the draft changed. The dirty state lives in the dialog's
 * DirtyStateProviderMixin, which compares drafts with editorStatesEqual.
 */
export class HomeConfigDraftSession {
  private constructor(
    readonly draft: EditorState,
    readonly generation: number
  ) {}

  static start(initial: EditorState): HomeConfigDraftSession {
    return new HomeConfigDraftSession(initial, 0);
  }

  withDraft(newDraft: EditorState): HomeConfigDraftSession {
    return new HomeConfigDraftSession(newDraft, this.generation + 1);
  }
}
