import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addOpenModal,
  removeOpenModal,
} from "../../src/common/dom/modal-stack";
import type { HomeAssistant } from "../../src/types";
import "../../src/managers/notification-manager";

// A toast removes its buttons when it closes, which drops focus to the page.
// A keyboard user who used a toast action should continue where they were,
// also inside an open dialog.

vi.mock("../../src/components/ha-button", () => {
  customElements.define(
    "ha-button",
    class extends HTMLElement {
      public connectedCallback() {
        this.tabIndex = 0;
      }
    }
  );
  return {};
});

@customElement("test-notification-focus-host")
class TestNotificationFocusHost extends LitElement {
  @property({ attribute: false }) public hass = {
    localize: (key: string) => key,
  } as unknown as HomeAssistant;

  protected render() {
    return html`
      <input />
      <input />
      <notification-manager .hass=${this.hass}></notification-manager>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-notification-focus-host": TestNotificationFocusHost;
  }
}

let host: TestNotificationFocusHost | undefined;
let modal: HTMLElement | undefined;

const mountManager = async () => {
  host = document.createElement("test-notification-focus-host");
  document.body.append(host);
  await host.updateComplete;
  return host.shadowRoot!.querySelector("notification-manager")!;
};

const openModal = async () => {
  modal = document.createElement("div");
  document.body.append(modal);
  addOpenModal(modal);
  // The manager moves in a microtask
  await Promise.resolve();
  return modal;
};

const showActionToast = async (
  manager: HTMLElementTagNameMap["notification-manager"],
  action: () => void
) => {
  vi.useFakeTimers();
  const shown = manager.showDialog({
    message: "Card deleted",
    action: { action, text: "Undo" },
    duration: -1,
  });
  await Promise.resolve();
  await manager.updateComplete;
  const toast = manager.shadowRoot!.querySelector("ha-toast")!;
  Object.defineProperty(
    toast.shadowRoot!.querySelector(".toast"),
    "getAnimations",
    { configurable: true, value: () => [] }
  );
  await vi.advanceTimersByTimeAsync(20);
  await shown;
  return toast;
};

// Focuses the toast button like a keyboard user tabbing to it, and uses it
const useToastAction = async (
  manager: HTMLElementTagNameMap["notification-manager"],
  toast: HTMLElementTagNameMap["ha-toast"]
) => {
  const button = manager.shadowRoot!.querySelector<HTMLElement>("ha-button")!;
  button.focus();
  expect(manager.shadowRoot!.activeElement).toBe(button);

  const closed = new Promise<void>((resolve) => {
    toast.addEventListener("toast-closed", () => resolve(), { once: true });
  });
  button.click();
  await closed;
  await manager.updateComplete;
};

afterEach(() => {
  if (modal) {
    removeOpenModal(modal);
    modal.remove();
    modal = undefined;
  }
  host?.remove();
  host = undefined;
  vi.useRealTimers();
});

describe("notification-manager focus after toast actions", () => {
  it("returns focus to where it was outside dialogs", async () => {
    const manager = await mountManager();
    const input = host!.shadowRoot!.querySelector("input")!;
    input.focus();
    const toast = await showActionToast(manager, vi.fn());

    await useToastAction(manager, toast);

    expect(host!.shadowRoot!.activeElement).toBe(input);
  });

  it("returns focus to where it was inside a dialog", async () => {
    const manager = await mountManager();
    const dialog = await openModal();
    const input = document.createElement("input");
    dialog.append(input);
    input.focus();
    const toast = await showActionToast(manager, vi.fn());

    await useToastAction(manager, toast);

    expect(document.activeElement).toBe(input);
  });

  it("leaves focus where a toast action moved it", async () => {
    const manager = await mountManager();
    const [input, otherInput] = host!.shadowRoot!.querySelectorAll("input");
    input.focus();
    const toast = await showActionToast(manager, () => otherInput.focus());

    await useToastAction(manager, toast);

    expect(host!.shadowRoot!.activeElement).toBe(otherInput);
  });
});
