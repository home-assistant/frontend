import { describe, expect, it, vi } from "vitest";
import "../../../../src/panels/home/components/home-shortcuts-editor";
import type { HomeShortcutsEditor } from "../../../../src/panels/home/components/home-shortcuts-editor";
import { showEditShortcutDialog } from "../../../../src/panels/home/dialogs/show-dialog-edit-shortcut";

vi.mock(
  "../../../../src/panels/home/dialogs/show-dialog-edit-shortcut",
  () => ({
    showEditShortcutDialog: vi.fn(),
  })
);

type Handlers = Record<
  "_addShortcut" | "_deleteShortcut" | "_editShortcut" | "_moved",
  (ev: Event) => void
>;

// What the editor's children report: the navigation picker's selection, a
// custom shortcut's edit and delete buttons and a drag.
const userActions = (el: HomeShortcutsEditor) => {
  const handlers = el as unknown as Handlers;
  const picked = new CustomEvent("value-changed", {
    detail: { value: "/lovelace/1" },
  });
  // _addShortcut() clears the picker it was called from
  Object.defineProperty(picked, "currentTarget", { value: {} });
  handlers._addShortcut(picked);
  const customIndex = el.shortcuts.findIndex((item) => item.type === "custom");
  handlers._editShortcut(
    new CustomEvent("edit-shortcut", { detail: { index: customIndex } })
  );
  handlers._deleteShortcut(
    new CustomEvent("delete-shortcut", { detail: { index: customIndex } })
  );
  handlers._moved(
    new CustomEvent("item-moved", { detail: { oldIndex: 0, newIndex: 1 } })
  );
};

describe("home-shortcuts-editor", () => {
  const createEditor = (disabled: boolean) => {
    vi.mocked(showEditShortcutDialog).mockClear();
    const el = document.createElement("home-shortcuts-editor");
    el.shortcuts = [
      { type: "summary", key: "light" },
      { type: "custom", path: "/lovelace/0" },
    ];
    el.disabled = disabled;
    const changed = vi.fn();
    el.addEventListener("value-changed", changed);
    return { el, changed };
  };

  it("changes nothing and opens no dialog while disabled", () => {
    const { el, changed } = createEditor(true);
    userActions(el);
    expect(changed).not.toHaveBeenCalled();
    expect(showEditShortcutDialog).not.toHaveBeenCalled();
  });

  it("reports each change and opens the shortcut dialog when enabled", () => {
    const { el, changed } = createEditor(false);
    userActions(el);
    expect(changed).toHaveBeenCalledTimes(3);
    expect(showEditShortcutDialog).toHaveBeenCalledTimes(1);
  });
});
