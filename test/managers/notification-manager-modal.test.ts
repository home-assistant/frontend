import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { afterEach, describe, expect, it } from "vitest";
import {
  addOpenModal,
  removeOpenModal,
} from "../../src/common/dom/modal-stack";
import type { HomeAssistant } from "../../src/types";
import "../../src/managers/notification-manager";

// While a modal dialog is open, the browser makes everything outside it inert,
// so toast buttons only work while the toasts are inside the topmost dialog.

@customElement("test-notification-modal-host")
class TestNotificationModalHost extends LitElement {
  @property({ attribute: false }) public hass = {
    localize: (key: string) => key,
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
const modals: TestModal[] = [];

const mountManager = async () => {
  host = document.createElement("test-notification-modal-host");
  document.body.append(host);
  await host.updateComplete;
  return host.shadowRoot!.querySelector("notification-manager")!;
};

// The manager moves in a microtask
const settle = () => Promise.resolve();

const openModal = async () => {
  const modal = document.createElement("test-notification-modal");
  document.body.append(modal);
  modals.push(modal);
  addOpenModal(modal);
  await settle();
  return modal;
};

afterEach(() => {
  modals.forEach((modal) => modal.remove());
  modals.length = 0;
  host?.remove();
  host = undefined;
});

describe("notification-manager with open modals", () => {
  it("stays in the topmost open modal and returns home after", async () => {
    const manager = await mountManager();
    const home = host!.shadowRoot!;

    const modal = await openModal();
    expect(manager.parentNode).toBe(modal);
    expect(manager.slot).toBe("toast-host");

    const nestedModal = await openModal();
    expect(manager.parentNode).toBe(nestedModal);

    removeOpenModal(modal);
    await settle();
    expect(manager.parentNode).toBe(nestedModal);

    removeOpenModal(nestedModal);
    await settle();
    expect(manager.parentNode).toBe(home);
    expect(manager.hasAttribute("slot")).toBe(false);
  });

  it("returns home when the modal holding it is removed from the page", async () => {
    const manager = await mountManager();
    const modal = await openModal();

    modal.remove();
    await settle();
    expect(manager.parentNode).toBe(host!.shadowRoot!);

    // It keeps following modals opened afterwards
    const nextModal = await openModal();
    expect(manager.parentNode).toBe(nextModal);
  });
});
