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

  public add = vi.fn();

  protected supportedShortcutsInInput(): SupportedShortcuts {
    return { Y: this.toggle };
  }

  protected supportedAltShortcuts(): SupportedShortcuts {
    return { N: this.add };
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
  const target = document.createElement("div");
  editor.renderRoot.append(input, target);
  return { editor, input, target };
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

const pressAdd = (target: HTMLElement, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", {
    key: "n",
    code: "KeyN",
    ctrlKey: true,
    altKey: true,
    bubbles: true,
    composed: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

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

describe("KeyboardShortcutMixin Ctrl/Cmd+Alt shortcuts", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    getTopOpenDialogTag.mockReset();
  });

  it("handles Ctrl and Cmd and prevents the default action", () => {
    const { editor, target } = createEditor();
    expect(pressAdd(target).defaultPrevented).toBe(true);
    pressAdd(target, { ctrlKey: false, metaKey: true });
    expect(editor.add).toHaveBeenCalledTimes(2);
  });

  it("matches the logical key on remapped layouts", () => {
    const { editor, target } = createEditor();
    // US Dvorak: N is on the physical L key
    pressAdd(target, { key: "n", code: "KeyL" });
    expect(editor.add).toHaveBeenCalledOnce();
  });

  it("does not match the physical key when the logical key is a Latin letter", () => {
    const { editor, target } = createEditor();
    // Dvorak: the physical N key produces L
    pressAdd(target, { key: "l", code: "KeyN" });
    expect(editor.add).not.toHaveBeenCalled();
  });

  it.each([
    ["Dead", "dead key"],
    ["~", "macOS Option+N"],
    ["т", "non-Latin layout"],
  ])("falls back to the physical key for %s (%s)", (logicalKey) => {
    const { editor, target } = createEditor();
    pressAdd(target, {
      key: logicalKey,
      code: "KeyN",
      ctrlKey: false,
      metaKey: true,
    });
    expect(editor.add).toHaveBeenCalledOnce();
  });

  it.each([
    ["without Alt", { altKey: false }],
    ["without Ctrl/Cmd", { ctrlKey: false }],
    ["with Shift", { shiftKey: true }],
  ])("ignores the shortcut %s", (_name, init) => {
    const { editor, target } = createEditor();
    pressAdd(target, init);
    expect(editor.add).not.toHaveBeenCalled();
  });

  it("ignores the shortcut while typing in an input", () => {
    const { editor, input } = createEditor();
    input.focus();
    // AltGr+N on some layouts is reported as Ctrl+Alt+N
    const event = pressAdd(input);
    expect(editor.add).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores the shortcut while a dialog is open", () => {
    const { editor, target } = createEditor();
    getTopOpenDialogTag.mockReturnValue("dialog-add-integration");
    pressAdd(target);
    expect(editor.add).not.toHaveBeenCalled();
  });

  it("ignores the shortcut from inline modal overlays", () => {
    const { editor } = createEditor();
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    const button = document.createElement("button");
    overlay.append(button);
    document.body.append(overlay);
    pressAdd(button);
    expect(editor.add).not.toHaveBeenCalled();
  });
});
