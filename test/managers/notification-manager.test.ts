import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../src/types";
import "../../src/managers/notification-manager";

const localize = vi.fn((key: string, args?: Record<string, string | number>) =>
  args ? `${key}:${JSON.stringify(args)}` : key
);

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

const deferred = () => {
  let resolve: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve: resolve! };
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

  it.each([
    { duration: 1, expected: 4000 },
    { duration: 4000, expected: 4000 },
    { duration: 4001, expected: 4001 },
    { duration: -1, expected: -1 },
  ])(
    "normalizes a $duration ms duration to $expected ms",
    async ({ duration, expected }) => {
      const manager = await mountManager();

      await manager.showDialog({ message: "Message", duration });

      expect(manager.shadowRoot!.querySelector("ha-toast")!.timeoutMs).toBe(
        expected
      );
    }
  );

  it("localizes visible and assistive messages with numeric arguments", async () => {
    const manager = await mountManager();

    await manager.showDialog({
      message: {
        translationKey: "ui.notification_toast.new_version_available",
        args: { seconds: 59 },
      },
      announceMessage: {
        translationKey: "ui.notification_toast.new_version_available",
        args: { seconds: 60 },
      },
    });

    const toast = manager.shadowRoot!.querySelector("ha-toast")!;
    expect(toast.labelText).toContain('"seconds":59');
    expect(toast.announceText).toContain('"seconds":60');
    expect(localize).toHaveBeenCalledWith(
      "ui.notification_toast.new_version_available",
      { seconds: 59 }
    );
    expect(localize).toHaveBeenCalledWith(
      "ui.notification_toast.new_version_available",
      { seconds: 60 }
    );
  });

  it("renders and invokes primary and secondary actions", async () => {
    const manager = await mountManager();
    const primary = vi.fn();
    const secondary = vi.fn();

    await manager.showDialog({
      message: "Update available",
      action: { action: primary, primary: true, text: "Update now" },
      secondaryAction: { action: secondary, text: "Cancel" },
      duration: -1,
    });

    const toast = manager.shadowRoot!.querySelector("ha-toast")!;
    const buttons = manager.shadowRoot!.querySelectorAll("ha-button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent?.trim()).toBe("Cancel");
    expect(buttons[0].getAttribute("appearance")).toBe("plain");
    expect(buttons[1].textContent?.trim()).toBe("Update now");
    expect(buttons[1].getAttribute("appearance")).toBe("filled");

    buttons[0].click();
    expect(toast.hide).toHaveBeenLastCalledWith("action");
    expect(secondary).toHaveBeenCalledOnce();
    expect(primary).not.toHaveBeenCalled();

    buttons[1].click();
    expect(toast.hide).toHaveBeenLastCalledWith("action");
    expect(primary).toHaveBeenCalledOnce();
  });

  it("keeps a same-ID toast visible while replacing its content", async () => {
    const manager = await mountManager();
    await manager.showDialog({ id: "status", message: "First" });
    const toast = manager.shadowRoot!.querySelector("ha-toast")!;
    vi.mocked(toast.hide).mockClear();

    await manager.showDialog({ id: "status", message: "Second" });

    expect(toast.hide).not.toHaveBeenCalled();
    expect(toast.labelText).toBe("Second");
  });

  it("hides a toast before replacing it with a different ID", async () => {
    const manager = await mountManager();
    await manager.showDialog({ id: "first", message: "First" });
    const toast = manager.shadowRoot!.querySelector("ha-toast")!;
    vi.mocked(toast.hide).mockClear();

    await manager.showDialog({ id: "second", message: "Second" });

    expect(toast.hide).toHaveBeenCalledOnce();
    expect(toast.labelText).toBe("Second");
  });

  it("ignores a stale replacement after a newer notification starts", async () => {
    const manager = await mountManager();
    await manager.showDialog({ id: "first", message: "First" });
    const toast = manager.shadowRoot!.querySelector("ha-toast")!;
    const delayedHide = deferred();
    vi.mocked(toast.hide).mockReturnValueOnce(delayedHide.promise);

    const staleShow = manager.showDialog({ id: "second", message: "Second" });
    await manager.showDialog({ id: "third", message: "Third" });
    delayedHide.resolve();
    await staleShow;

    expect(toast.labelText).toBe("Third");
  });

  it("clears rendered state after the toast closes", async () => {
    const manager = await mountManager();
    await manager.showDialog({ message: "Message" });
    manager.shadowRoot!.querySelector("ha-toast")!.dispatchEvent(
      new CustomEvent("toast-closed", {
        detail: { reason: "programmatic" },
      })
    );

    await manager.updateComplete;

    expect(manager.shadowRoot!.querySelector("ha-toast")).toBeNull();
  });
});
