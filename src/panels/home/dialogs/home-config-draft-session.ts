import type { EditorState } from "./home-config-editor-state";

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
