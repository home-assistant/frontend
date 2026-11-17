import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addOpenModal,
  removeOpenModal,
} from "../../src/common/dom/modal-stack";
import type { HomeAssistant } from "../../src/types";
import "../../src/managers/notification-manager";

// While a modal dialog is open, the browser makes everything outside it inert,
// so toast buttons only work while the toasts are inside the topmost dialog.

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

const localize = (key: string) => key;

@customElement("test-notification-modal-host")
class TestNotificationModalHost extends LitElement {
  @property({ attribute: false }) public hass = {
    localize,
  } as unknown as HomeAssistant;

  protected render() {
    return html`<notification-manager
      .hass=${this.hass}
    ></notification-manager>`;
  }
}

// Like ha-dialog, closes itself when removed from the page
class TestModal extends HTMLElement {
  public disconnectedCallback() {
    removeOpenModal(this);
  }
}
customElements.define("test-notification-modal", TestModal);

declare global {
  interface HTMLElementTagNameMap {
    "test-notification-modal-host": TestNotificationModalHost;
    "test-notification-modal": TestModal;
  }
}

let host: TestNotificationModalHost | undefined;
const modals: HTMLElement[] = [];

const mountManager = async () => {
  host = document.createElement("test-notification-modal-host");
  document.body.append(host);
  await host.updateComplete;
  return host.shadowRoot!.querySelector("notification-manager")!;
};

const openModal = async () => {
  const modal = document.createElement("test-notification-modal");
  document.body.append(modal);
  modals.push(modal);
  addOpenModal(modal);
  // The manager moves in a microtask
  await Promise.resolve();
  return modal;
};

const closeModal = async (modal: HTMLElement) => {
  removeOpenModal(modal);
  await Promise.resolve();
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

afterEach(() => {
  modals.forEach((modal) => {
    removeOpenModal(modal);
    modal.remove();
  });
  modals.length = 0;
  host?.remove();
  host = undefined;
  vi.useRealTimers();
});

describe("notification-manager with open modals", () => {
  it("moves into the topmost open modal and back", async () => {
    const manager = await mountManager();
    const home = host!.shadowRoot!;

    const modal = await openModal();
    expect(manager.parentNode).toBe(modal);
    expect(manager.slot).toBe("toast-host");

    const nestedModal = await openModal();
    expect(manager.parentNode).toBe(nestedModal);

    await closeModal(nestedModal);
    expect(manager.parentNode).toBe(modal);

    await closeModal(modal);
    expect(manager.parentNode).toBe(home);
    expect(manager.hasAttribute("slot")).toBe(false);
  });

  it("stays in the topmost modal when a modal below it closes", async () => {
    const manager = await mountManager();
    const modal = await openModal();
    const nestedModal = await openModal();

    await closeModal(modal);
    expect(manager.parentNode).toBe(nestedModal);

    await closeModal(nestedModal);
    expect(manager.parentNode).toBe(host!.shadowRoot!);
  });

  it("returns home when the modal holding it is removed from the page", async () => {
    const manager = await mountManager();
    const home = host!.shadowRoot!;
    const modal = await openModal();

    modal.remove();
    await Promise.resolve();
    expect(manager.parentNode).toBe(home);

    // It keeps following modals opened afterwards
    const nextModal = await openModal();
    expect(manager.parentNode).toBe(nextModal);
  });

  it("runs the action of a toast that moved into a modal", async () => {
    const manager = await mountManager();
    const action = vi.fn();
    const toast = await showActionToast(manager, action);

    await openModal();
    expect(manager.shadowRoot!.querySelector("ha-toast")).toBe(toast);

    const closed = new Promise<void>((resolve) => {
      toast.addEventListener("toast-closed", () => resolve(), { once: true });
    });
    manager.shadowRoot!.querySelector<HTMLElement>("ha-button")!.click();
    await closed;
    await manager.updateComplete;

    expect(action).toHaveBeenCalledOnce();
    expect(manager.shadowRoot!.querySelector("ha-toast")).toBeNull();
  });

  it("returns focus to where it was after a focused toast closes", async () => {
    const manager = await mountManager();
    const modal = await openModal();
    const input = document.createElement("input");
    modal.append(input);
    input.focus();
    const toast = await showActionToast(manager, vi.fn());

    const button = manager.shadowRoot!.querySelector<HTMLElement>("ha-button")!;
    button.focus();
    expect(manager.shadowRoot!.activeElement).toBe(button);

    const closed = new Promise<void>((resolve) => {
      toast.addEventListener("toast-closed", () => resolve(), { once: true });
    });
    button.click();
    await closed;
    await manager.updateComplete;

    expect(document.activeElement).toBe(input);
  });
});
