import { LitElement } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KeyboardShortcutMixin,
  normalizeShortcutKey,
} from "../../src/mixins/keyboard-shortcut-mixin";

const { getTopOpenDialogTag } = vi.hoisted(() => ({
  getTopOpenDialogTag: vi.fn<() => string | undefined>(),
}));

vi.mock("../../src/dialogs/make-dialog-manager", () => ({
  getTopOpenDialogTag,
}));

class TestShortcutEditor extends KeyboardShortcutMixin(LitElement) {
  public toggle = vi.fn();

  protected supportedShortcutsInInput(): SupportedShortcuts {
    return { Y: this.toggle };
  }
}

class TestShortcutDialog extends TestShortcutEditor {}

customElements.define("test-shortcut-editor", TestShortcutEditor);
customElements.define("test-shortcut-dialog", TestShortcutDialog);

declare global {
  interface HTMLElementTagNameMap {
    "test-shortcut-editor": TestShortcutEditor;
    "test-shortcut-dialog": TestShortcutDialog;
  }
}

const key = (init: KeyboardEventInit) =>
  normalizeShortcutKey(new KeyboardEvent("keydown", init));

const createEditor = (
  tag: "test-shortcut-editor" | "test-shortcut-dialog" = "test-shortcut-editor"
) => {
  const editor = document.createElement(tag);
  document.body.append(editor);
  const input = document.createElement("input");
  editor.renderRoot.append(input);
  return { editor, input };
};

const pressToggle = (target: HTMLElement) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Y",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      composed: true,
    })
  );

describe("normalizeShortcutKey", () => {
  it("works", () => {
    expect(key({ key: "y" })).toBe("y");
    expect(key({ key: "y", shiftKey: true })).toBe("Y");
    // Caps Lock produces an uppercase key without Shift, which must not
    // trigger the Shift shortcut
    expect(key({ key: "Y" })).toBe("y");
    expect(key({ key: "Escape", shiftKey: true })).toBe("Escape");
  });
});

describe("KeyboardShortcutMixin input shortcuts", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    getTopOpenDialogTag.mockReset();
  });

  it("handles the shortcut from a focused input", async () => {
    const { editor, input } = createEditor();
    input.focus();
    pressToggle(input);
    await vi.waitFor(() => expect(editor.toggle).toHaveBeenCalledOnce());
    expect(document.activeElement).not.toBe(input);
  });

  it("only lets the topmost dialog handle the shortcut", async () => {
    const { editor: background } = createEditor();
    const { editor: dialog, input } = createEditor("test-shortcut-dialog");
    getTopOpenDialogTag.mockReturnValue("test-shortcut-dialog");
    pressToggle(input);
    await vi.waitFor(() => expect(dialog.toggle).toHaveBeenCalledOnce());
    expect(background.toggle).not.toHaveBeenCalled();
  });

  it("stops handling after removing the listeners", async () => {
    const { editor, input } = createEditor();
    editor.removeKeyboardShortcuts();
    pressToggle(input);

    // Removed while waiting for the focused field to commit
    const { editor: pending, input: pendingInput } = createEditor();
    pendingInput.focus();
    pressToggle(pendingInput);
    pending.remove();

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(editor.toggle).not.toHaveBeenCalled();
    expect(pending.toggle).not.toHaveBeenCalled();
  });
});
