import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../src/types";
import "../../src/managers/notification-manager";

vi.mock("../../src/components/ha-button", () => {
  customElements.define("ha-button", class extends HTMLElement {});
  return {};
});

vi.mock("../../src/components/ha-icon-button", () => {
  customElements.define("ha-icon-button", class extends HTMLElement {});
  return {};
});

vi.mock("../../src/components/ha-toast", () => {
  customElements.define(
    "ha-toast",
    class extends HTMLElement {
      public show = vi.fn();

      public hide = vi.fn();
    }
  );
  return {};
});

@customElement("test-notification-manager-host")
class TestNotificationManagerHost extends LitElement {
  @property({ attribute: false }) public hass = {
    localize: vi.fn((key: string) => key),
  } as unknown as HomeAssistant;

  protected render() {
    return html`<notification-manager
      .hass=${this.hass}
    ></notification-manager>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "test-notification-manager-host": TestNotificationManagerHost;
  }
}

let host: TestNotificationManagerHost | undefined;

const mountManager = async () => {
  host = document.createElement(
    "test-notification-manager-host"
  ) as TestNotificationManagerHost;
  document.body.append(host);
  await host.updateComplete;
  return host.shadowRoot!.querySelector("notification-manager")!;
};

afterEach(() => {
  host?.remove();
  host = undefined;
  vi.clearAllMocks();
});

describe("notification-manager", () => {
  it("shows a message with the default duration", async () => {
    const manager = await mountManager();

    await manager.showDialog({ message: "Configuration saved" });

    const toast = manager.shadowRoot!.querySelector("ha-toast")!;
    expect(toast.labelText).toBe("Configuration saved");
    expect(toast.timeoutMs).toBe(4000);
    expect(toast.bottomOffset).toBe(0);
    expect(toast.show).toHaveBeenCalledOnce();
  });

  it("renders a dismiss button and closes with the dismiss reason", async () => {
    const manager = await mountManager();

    await manager.showDialog({
      message: "Connection lost",
      dismissable: true,
      duration: -1,
      bottomOffset: 16,
    });

    const toast = manager.shadowRoot!.querySelector("ha-toast")!;
    expect(toast.timeoutMs).toBe(-1);
    expect(toast.bottomOffset).toBe(16);

    manager.shadowRoot!.querySelector<HTMLElement>("ha-icon-button")!.click();
    expect(toast.hide).toHaveBeenCalledWith("dismiss");
  });

  it("clears the current notification when duration is zero", async () => {
    const manager = await mountManager();
    await manager.showDialog({ message: "First message", duration: -1 });

    await manager.showDialog({ message: "", duration: 0 });
    await manager.updateComplete;

    expect(manager.shadowRoot!.querySelector("ha-toast")).toBeNull();
  });
});
