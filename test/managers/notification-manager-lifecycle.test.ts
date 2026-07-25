import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../src/types";
import "../../src/managers/notification-manager";

vi.mock("../../src/components/ha-button", () => {
  customElements.define("ha-button", class extends HTMLElement {});
  return {};
});

const localize = (key: string, args?: Record<string, string | number>) =>
  args ? `${key}:${JSON.stringify(args)}` : key;

@customElement("test-notification-lifecycle-host")
class TestNotificationLifecycleHost extends LitElement {
  @property({ attribute: false }) public hass = {
    localize,
  } as unknown as HomeAssistant;

  protected render() {
    return html`<notification-manager
      .hass=${this.hass}
    ></notification-manager>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-notification-lifecycle-host": TestNotificationLifecycleHost;
  }
}

let host: TestNotificationLifecycleHost | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
  vi.useRealTimers();
});

describe("notification toast lifecycle", () => {
  it("updates a visible toast and closes it after its primary action", async () => {
    vi.useFakeTimers();
    host = document.createElement("test-notification-lifecycle-host");
    document.body.append(host);
    await host.updateComplete;
    const manager = host.shadowRoot!.querySelector("notification-manager")!;
    const action = vi.fn();

    const firstShow = manager.showDialog({
      id: "frontend-update-available",
      message: {
        translationKey: "ui.notification_toast.new_version_available",
        args: { seconds: 60 },
      },
      announceMessage: {
        translationKey: "ui.notification_toast.new_version_available",
        args: { seconds: 60 },
      },
      action: { action, primary: true, text: "Update now" },
      duration: -1,
    });
    await Promise.resolve();
    await manager.updateComplete;
    const toast = manager.shadowRoot!.querySelector("ha-toast")!;
    Object.defineProperty(
      toast.shadowRoot!.querySelector(".toast"),
      "getAnimations",
      {
        configurable: true,
        value: () => [],
      }
    );
    await vi.advanceTimersByTimeAsync(20);
    await firstShow;

    expect(toast.shadowRoot!.querySelector(".toast")!.classList).toContain(
      "visible"
    );
    expect(toast.shadowRoot!.querySelector(".message")!.textContent).toContain(
      '"seconds":60'
    );
    expect(
      toast.shadowRoot!.querySelector(".assistive-message")!.textContent
    ).toContain('"seconds":60');

    await manager.showDialog({
      id: "frontend-update-available",
      message: {
        translationKey: "ui.notification_toast.new_version_available",
        args: { seconds: 59 },
      },
      announceMessage: {
        translationKey: "ui.notification_toast.new_version_available",
        args: { seconds: 60 },
      },
      action: { action, primary: true, text: "Update now" },
      duration: -1,
    });

    expect(toast.shadowRoot!.querySelector(".message")!.textContent).toContain(
      '"seconds":59'
    );
    expect(
      toast.shadowRoot!.querySelector(".assistive-message")!.textContent
    ).toContain('"seconds":60');

    const closed = new Promise<void>((resolve) => {
      toast.addEventListener("toast-closed", () => resolve(), { once: true });
    });
    manager.shadowRoot!.querySelector<HTMLElement>("ha-button")!.click();
    await closed;
    await manager.updateComplete;

    expect(action).toHaveBeenCalledOnce();
    expect(manager.shadowRoot!.querySelector("ha-toast")).toBeNull();
  });
});
