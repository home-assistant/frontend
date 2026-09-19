import { shallowEqual } from "../../../common/util/shallow-equal";
import type { EditorState } from "./dialog-edit-home";

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
    return !shallowEqual(this.draft, this._baseline);
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
