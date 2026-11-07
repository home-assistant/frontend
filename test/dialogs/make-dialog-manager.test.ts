import type { LitElement } from "lit";
import { describe, expect, it } from "vitest";
import { fireEvent } from "../../src/common/dom/fire_event";
import {
  getTopOpenDialogTag,
  showDialog,
} from "../../src/dialogs/make-dialog-manager";
import type { ProvideHassElement } from "../../src/mixins/provide-hass-lit-mixin";

// Shortcuts only reach the topmost open dialog, so a tag that stays tracked
// after its dialog closed blocks them everywhere until the page reloads, and
// a dialog untracked while still open lets the page behind it handle them.

class TestDialog extends HTMLElement {
  public showDialog() {
    // Legacy dialogs render into their own shadow root
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  public close() {
    // Some dialogs fire it without their tag in the detail
    fireEvent(this, "dialog-closed");
  }
}

class TestNestedDialog extends TestDialog {}

customElements.define("test-manager-dialog", TestDialog);
customElements.define("test-manager-nested-dialog", TestNestedDialog);

declare global {
  interface HTMLElementTagNameMap {
    "test-manager-dialog": TestDialog;
    "test-manager-nested-dialog": TestNestedDialog;
  }
}

const host = () => {
  const element = document.createElement("div");
  element.attachShadow({ mode: "open" });
  (element as unknown as ProvideHassElement).provideHass = () => undefined;
  return element as unknown as LitElement & ProvideHassElement;
};

const show = async <T extends TestDialog>(
  element: LitElement & ProvideHassElement,
  dialogTag: string,
  parentElement?: LitElement
) => {
  await showDialog(
    element,
    dialogTag,
    {},
    () => Promise.resolve(),
    parentElement,
    false
  );
  return (parentElement ?? element).shadowRoot!.querySelector(dialogTag) as T;
};

describe("dialog manager open dialog tracking", () => {
  it("works", async () => {
    const element = host();
    const dialog = await show(element, "test-manager-dialog");
    expect(getTopOpenDialogTag()).toBe("test-manager-dialog");

    // A dialog mounted inside another one bubbles its close through it
    const nested = await show(
      element,
      "test-manager-nested-dialog",
      dialog as unknown as LitElement
    );
    expect(getTopOpenDialogTag()).toBe("test-manager-nested-dialog");
    nested.close();
    expect(getTopOpenDialogTag()).toBe("test-manager-dialog");

    dialog.close();
    expect(getTopOpenDialogTag()).toBeUndefined();
  });
});
