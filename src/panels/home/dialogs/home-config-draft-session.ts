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
 * Immutable draft/dirty/staleness tracker for the home dashboard editor.
 * Every mutation returns a new instance so Lit's reference-based reactivity
 * (`changedProps.has("_session")`) keeps working the same way `_state` did.
 */
export class HomeConfigDraftSession {
  private constructor(
    private readonly _baseline: EditorState,
    readonly draft: EditorState,
    readonly generation: number
  ) {}

  static start(initial: EditorState): HomeConfigDraftSession {
    return new HomeConfigDraftSession(initial, initial, 0);
  }

  get isDirty(): boolean {
    return !editorStatesEqual(this.draft, this._baseline);
  }

  withDraft(newDraft: EditorState): HomeConfigDraftSession {
    return new HomeConfigDraftSession(
      this._baseline,
      newDraft,
      this.generation + 1
    );
  }

  /**
   * Call on the *current* session once a save that started at
   * `atGeneration` (with the draft that was current then) succeeds.
   * `stale` is true when a newer edit exists: the baseline still rebases
   * to what was actually persisted, but the live draft is left untouched.
   */
  withSaved(
    atGeneration: number,
    savedDraft: EditorState
  ): { session: HomeConfigDraftSession; stale: boolean } {
    return {
      session: new HomeConfigDraftSession(
        savedDraft,
        this.draft,
        this.generation
      ),
      stale: atGeneration !== this.generation,
    };
  }
}
