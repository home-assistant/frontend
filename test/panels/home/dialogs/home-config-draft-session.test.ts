import { describe, expect, it } from "vitest";
import {
  resolveShortcutItems,
  type ShortcutItem,
} from "../../../../src/data/home_shortcuts";
import type { EditorState } from "../../../../src/panels/home/dialogs/home-config-editor-state";
import {
  editorStatesEqual,
  HomeConfigDraftSession,
} from "../../../../src/panels/home/dialogs/home-config-draft-session";

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

describe("editorStatesEqual", () => {
  it("treats different content as not equal", () => {
    expect(editorStatesEqual(stateB, stateA)).toBe(false);
  });

  it("treats content edited back to the original as equal", () => {
    expect(editorStatesEqual({ ...stateA }, stateA)).toBe(true);
  });

  it("compares array fields by content, not by reference (a round-trip edit produces a new array)", () => {
    const withFavorite: EditorState = {
      ...stateA,
      favorite_entities: ["light.kitchen"],
    };
    // A brand new array literal with the same contents as the baseline's,
    // not the same reference as withFavorite.favorite_entities.
    expect(
      editorStatesEqual(
        { ...withFavorite, favorite_entities: ["light.kitchen"] },
        withFavorite
      )
    ).toBe(true);
    expect(
      editorStatesEqual(
        {
          ...withFavorite,
          favorite_entities: ["light.kitchen", "light.hallway"],
        },
        withFavorite
      )
    ).toBe(false);
  });

  describe("shortcut shape normalization", () => {
    it("is equal after hiding then showing a shortcut again (hidden: undefined)", () => {
      expect(
        editorStatesEqual(
          withShortcuts(setHidden(undefined)),
          withShortcuts(defaults)
        )
      ).toBe(true);
    });

    it("treats no stored shortcuts and the full resolved default list as equal", () => {
      expect(
        editorStatesEqual(
          withShortcuts(resolveShortcutItems([])),
          withShortcuts([])
        )
      ).toBe(true);
    });

    it("ignores undefined keys on custom shortcuts", () => {
      const custom: ShortcutItem = { type: "custom", path: "/lovelace/0" };
      expect(
        editorStatesEqual(
          withShortcuts([
            { ...custom, label: undefined, icon: undefined, color: undefined },
          ]),
          withShortcuts([custom])
        )
      ).toBe(true);
    });

    it("is not equal when a shortcut is really hidden, reordered or added", () => {
      const start = withShortcuts([]);
      expect(editorStatesEqual(withShortcuts(setHidden(true)), start)).toBe(
        false
      );
      expect(
        editorStatesEqual(withShortcuts([...defaults].reverse()), start)
      ).toBe(false);
      expect(
        editorStatesEqual(
          withShortcuts([...defaults, { type: "custom", path: "/lovelace/0" }]),
          start
        )
      ).toBe(false);
    });
  });
});
