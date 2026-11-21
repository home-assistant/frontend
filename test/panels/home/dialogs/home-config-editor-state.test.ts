import { describe, expect, it } from "vitest";
import type { HomeFrontendSystemData } from "../../../../src/data/frontend";
import {
  resolveShortcutItems,
  type ShortcutItem,
} from "../../../../src/data/home_shortcuts";
import {
  buildHomeConfig,
  editorStatesEqual,
  type EditorState,
} from "../../../../src/panels/home/dialogs/home-config-editor-state";

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

describe("buildHomeConfig", () => {
  it("omits empty favorite_entities and shortcuts arrays", () => {
    const result = buildHomeConfig({}, stateA);
    expect(result.favorite_entities).toBeUndefined();
    expect(result.shortcuts).toBeUndefined();
  });

  it("clears previously saved favorite_entities and shortcuts when the draft is emptied", () => {
    const baseConfig: HomeFrontendSystemData = {
      favorite_entities: ["light.old"],
      shortcuts: [{ type: "custom", path: "/lovelace/0" }],
    };
    const result = buildHomeConfig(baseConfig, stateA);
    expect(result.favorite_entities).toBeUndefined();
    expect(result.shortcuts).toBeUndefined();
  });

  it("keeps non-empty favorite_entities and shortcuts arrays", () => {
    const state: EditorState = {
      ...stateA,
      favorite_entities: ["light.kitchen"],
      shortcuts: [{ type: "custom", path: "/lovelace/0" }],
    };
    const result = buildHomeConfig({}, state);
    expect(result.favorite_entities).toEqual(["light.kitchen"]);
    expect(result.shortcuts).toEqual([{ type: "custom", path: "/lovelace/0" }]);
  });

  it("maps show_welcome_message=false to hide_welcome_message=true", () => {
    const state: EditorState = { ...stateA, show_welcome_message: false };
    expect(buildHomeConfig({}, state).hide_welcome_message).toBe(true);
  });

  it("maps show_welcome_message=true to hide_welcome_message=undefined", () => {
    const state: EditorState = { ...stateA, show_welcome_message: true };
    expect(buildHomeConfig({}, state).hide_welcome_message).toBeUndefined();
  });

  it("maps show_suggested_entities=false to hide_suggested_entities=true", () => {
    const state: EditorState = {
      ...stateA,
      show_suggested_entities: false,
    };
    expect(buildHomeConfig({}, state).hide_suggested_entities).toBe(true);
  });

  it("preserves base config fields the editor does not manage", () => {
    const baseConfig: HomeFrontendSystemData = {
      welcome_banner_dismissed: true,
    };
    expect(buildHomeConfig(baseConfig, stateA).welcome_banner_dismissed).toBe(
      true
    );
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
