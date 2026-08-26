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

afterEach(() => {
  host?.remove();
  host = undefined;
  vi.clearAllMocks();
});

describe("notification-manager", () => {
  it("closes with the dismiss reason", async () => {
    const manager = await mountManager();

    await manager.showDialog({
      message: "Connection lost",
      dismissable: true,
      duration: -1,
    });

    const toast = manager.shadowRoot!.querySelector("ha-toast")!;
    manager.shadowRoot!.querySelector<HTMLElement>("ha-icon-button")!.click();
    expect(toast.hide).toHaveBeenCalledWith("dismiss");
  });

  it("clears the latest anonymous notification when duration is zero without an ID", async () => {
    const manager = await mountManager();
    await manager.showDialog({ message: "First message", duration: -1 });
    await manager.showDialog({
      id: "identified",
      message: "Identified message",
      duration: -1,
    });
    await manager.showDialog({ message: "Second message", duration: -1 });

    await manager.showDialog({ message: "", duration: 0 });
    await manager.updateComplete;

    expect(
      [...manager.shadowRoot!.querySelectorAll("ha-toast")].map(
        (toast) => toast.labelText
      )
    ).toEqual(["First message", "Identified message"]);
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

  it("invokes primary and secondary actions", async () => {
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

    buttons[0].click();
    expect(toast.hide).toHaveBeenLastCalledWith("action");
    expect(secondary).toHaveBeenCalledOnce();
    expect(primary).not.toHaveBeenCalled();

    buttons[1].click();
    expect(toast.hide).toHaveBeenLastCalledWith("action");
    expect(primary).toHaveBeenCalledOnce();
  });

  it("invokes the action belonging to the selected stacked toast", async () => {
    const manager = await mountManager();
    const firstAction = vi.fn();
    const secondAction = vi.fn();
    await manager.showDialog({
      id: "first",
      message: "First",
      action: { action: firstAction, text: "First action" },
      duration: -1,
    });
    await manager.showDialog({
      id: "second",
      message: "Second",
      action: { action: secondAction, text: "Second action" },
      duration: -1,
    });

    manager.shadowRoot!.querySelectorAll("ha-button")[1].click();

    expect(secondAction).toHaveBeenCalledOnce();
    expect(firstAction).not.toHaveBeenCalled();
    expect(
      manager.shadowRoot!.querySelectorAll("ha-toast")[1].hide
    ).toHaveBeenCalledWith("action");
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

  it("stacks toasts with different IDs", async () => {
    const manager = await mountManager();
    await manager.showDialog({ id: "first", message: "First" });
    await manager.showDialog({ id: "second", message: "Second" });

    const toasts = manager.shadowRoot!.querySelectorAll("ha-toast");
    expect(toasts).toHaveLength(2);
    expect([...toasts].map((toast) => toast.labelText)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("uses the largest bottom offset for the notification stack", async () => {
    const manager = await mountManager();
    await manager.showDialog({
      id: "first",
      message: "First",
      bottomOffset: 16,
    });
    await manager.showDialog({
      id: "second",
      message: "Second",
      bottomOffset: 48,
    });

    expect(
      manager
        .shadowRoot!.querySelector<HTMLElement>(".stack")!
        .style.getPropertyValue("--notification-stack-bottom-offset")
    ).toBe("48px");
  });

  it("closes only the toast matching a duration-zero ID", async () => {
    const manager = await mountManager();
    await manager.showDialog({ id: "first", message: "First" });
    await manager.showDialog({ id: "second", message: "Second" });

    await manager.showDialog({ id: "first", message: "", duration: 0 });
    await manager.updateComplete;

    const toasts = manager.shadowRoot!.querySelectorAll("ha-toast");
    expect(toasts).toHaveLength(1);
    expect(toasts[0].labelText).toBe("Second");
  });

  it("keeps a same-ID update that arrives while the previous toast closes", async () => {
    const manager = await mountManager();
    await manager.showDialog({ id: "status", message: "First" });
    const toast = manager.shadowRoot!.querySelector("ha-toast")!;
    let finishHide: () => void;
    vi.mocked(toast.hide).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishHide = resolve;
        })
    );

    const closing = manager.showDialog({
      id: "status",
      message: "",
      duration: 0,
    });
    await Promise.resolve();
    await manager.showDialog({ id: "status", message: "Second" });
    finishHide!();
    await closing;
    await manager.updateComplete;

    const remainingToast = manager.shadowRoot!.querySelector("ha-toast")!;
    expect(remainingToast.labelText).toBe("Second");
  });

  it("keeps a frontend update visible throughout server startup", async () => {
    const manager = await mountManager();
    await manager.showDialog({
      id: "frontend-update-available",
      message: "Frontend update available",
      duration: -1,
    });
    await manager.showDialog({
      id: "server-startup",
      message: "Home Assistant is starting",
      duration: -1,
    });
    await manager.showDialog({
      id: "server-startup",
      message: "Starting recorder",
      duration: -1,
    });

    expect(
      [...manager.shadowRoot!.querySelectorAll("ha-toast")].map(
        (toast) => toast.labelText
      )
    ).toEqual(["Frontend update available", "Starting recorder"]);

    await manager.showDialog({
      id: "server-startup",
      message: "Home Assistant started",
      duration: 5000,
    });

    expect(
      [...manager.shadowRoot!.querySelectorAll("ha-toast")].map(
        (toast) => toast.labelText
      )
    ).toEqual(["Frontend update available", "Home Assistant started"]);
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
