import { describe, expect, it } from "vitest";
import {
  resolveShortcutItems,
  type ShortcutItem,
} from "../../../../src/data/home_shortcuts";
import type { EditorState } from "../../../../src/panels/home/dialogs/home-config-editor-state";
import { HomeConfigDraftSession } from "../../../../src/panels/home/dialogs/home-config-draft-session";

const stateA: EditorState = {
  favorite_entities: [],
  show_suggested_entities: true,
  show_welcome_message: true,
  shortcuts: [],
};

const stateB: EditorState = {
  ...stateA,
  show_welcome_message: false,
};

const withShortcuts = (shortcuts: ShortcutItem[]): EditorState => ({
  ...stateA,
  shortcuts,
});
const defaults = resolveShortcutItems([]);
const setHidden = (hidden: true | undefined): ShortcutItem[] =>
  defaults.map((item) =>
    item.type === "summary" && item.key === "light" ? { ...item, hidden } : item
  );

describe("HomeConfigDraftSession", () => {
  it("starts with the initial draft and generation 0", () => {
    const session = HomeConfigDraftSession.start(stateA);
    expect(session.draft).toEqual(stateA);
    expect(session.generation).toBe(0);
  });

  it("bumps the generation when the draft changes", () => {
    const session = HomeConfigDraftSession.start(stateA).withDraft(stateB);
    expect(session.draft).toEqual(stateB);
    expect(session.generation).toBe(1);
  });

  it("still bumps the generation when the draft is edited back to the initial content", () => {
    const session = HomeConfigDraftSession.start(stateA)
      .withDraft(stateB)
      .withDraft(stateA);
    expect(session.generation).toBe(2);
  });

  it("keeps the draft as emitted: normalization is for comparison only", () => {
    const draft = withShortcuts(setHidden(undefined));
    const session = HomeConfigDraftSession.start(withShortcuts([])).withDraft(
      draft
    );
    expect(session.draft).toBe(draft);
  });
});
