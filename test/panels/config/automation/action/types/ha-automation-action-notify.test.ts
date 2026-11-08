import { afterEach, describe, expect, it, vi } from "vitest";

import "../../../../../../src/panels/config/automation/action/types/ha-automation-action-notify";
import type { HaNotifyAction } from "../../../../../../src/panels/config/automation/action/types/ha-automation-action-notify";
import type { NotifyAction } from "../../../../../../src/data/script";
import type { HomeAssistant } from "../../../../../../src/types";

const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
  return {};
});

// The real implementations pull in the whole selector/form stack; this test
// only needs their `value-changed` contract, like other component tests do.
vi.mock("../../../../../../src/components/ha-form/ha-form", () =>
  stubElement("ha-form")
);
vi.mock("../../../../../../src/components/device/ha-device-picker", () =>
  stubElement("ha-device-picker")
);
vi.mock("../../../../../../src/components/ha-button", () =>
  stubElement("ha-button")
);

const localize = ((key: string) => key) as HomeAssistant["localize"];

const baseHass = (overrides: Partial<HomeAssistant> = {}): HomeAssistant =>
  ({
    localize,
    devices: {},
    entities: {},
    services: { notify: {} },
    ...overrides,
  }) as unknown as HomeAssistant;

let host: HTMLDivElement;

afterEach(() => {
  host?.remove();
});

const mount = async (hass: HomeAssistant, action: NotifyAction) => {
  host = document.createElement("div");
  document.body.append(host);
  const el = document.createElement(
    "ha-automation-action-notify"
  ) as HaNotifyAction;
  el.hass = hass;
  el.action = action;
  host.append(el);
  await el.updateComplete;
  return el;
};

describe("ha-automation-action-notify", () => {
  it("rejects a legacy action whose device slug matches more than one device", async () => {
    const hass = baseHass({
      devices: {
        one: { id: "one", name: "Shared" } as any,
        two: { id: "two", name: "shared" } as any,
      },
      services: { notify: { mobile_app_shared: {} } } as any,
    });
    const el = await mount(hass, {
      action: "notify.mobile_app_shared",
      data: { message: "hi" },
    });

    const unavailable = new Promise<Error>((resolve) => {
      el.addEventListener(
        "ui-mode-not-available",
        (ev: any) => resolve(ev.detail),
        { once: true }
      );
    });
    // Re-set to force the check to run again now that the listener is attached
    el.action = { ...el.action };
    await el.updateComplete;

    await expect(unavailable).resolves.toBeInstanceOf(Error);
  });

  it("switches a send_message action to the device's legacy action once it is edited", async () => {
    const hass = baseHass({
      devices: {
        jans_iphone: { id: "jans_iphone", name: "Jans iPhone" } as any,
      },
      entities: {
        "notify.jans_iphone": {
          entity_id: "notify.jans_iphone",
          device_id: "jans_iphone",
          labels: [],
        } as any,
      },
      services: { notify: { mobile_app_jans_iphone: {} } } as any,
    });
    const el = await mount(hass, {
      action: "notify.send_message",
      target: { entity_id: "notify.jans_iphone" },
      data: { message: "The garage door is open" },
    });

    const valueChanged = new Promise<{ value: NotifyAction }>((resolve) => {
      el.addEventListener("value-changed", (ev: any) => resolve(ev.detail), {
        once: true,
      });
    });

    const mainForm = el.shadowRoot!.querySelector("ha-form")!;
    mainForm.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: {
          value: { message: "The garage door is still open", title: "" },
        },
      })
    );

    const { value } = await valueChanged;
    // The device has a legacy action: it should carry the edit, not send_message
    expect(value.action).toBe("notify.mobile_app_jans_iphone");
    expect(value.target).toBeUndefined();
    expect(value.data?.message).toBe("The garage door is still open");
  });

  it("keeps the existing recipient when editing a field and there is no legacy action to switch to", async () => {
    const hass = baseHass({
      devices: {
        jans_iphone: { id: "jans_iphone", name: "Jans iPhone" } as any,
      },
      // Two notify entities on the same device, no legacy action registered
      entities: {
        "notify.jans_iphone_1": {
          entity_id: "notify.jans_iphone_1",
          device_id: "jans_iphone",
          labels: [],
        } as any,
        "notify.jans_iphone_2": {
          entity_id: "notify.jans_iphone_2",
          device_id: "jans_iphone",
          labels: [],
        } as any,
      },
    });
    const el = await mount(hass, {
      action: "notify.send_message",
      target: { entity_id: "notify.jans_iphone_2" },
      data: { message: "The garage door is open" },
    });

    const valueChanged = new Promise<{ value: NotifyAction }>((resolve) => {
      el.addEventListener("value-changed", (ev: any) => resolve(ev.detail), {
        once: true,
      });
    });

    const mainForm = el.shadowRoot!.querySelector("ha-form")!;
    mainForm.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: {
          value: { message: "The garage door is still open", title: "" },
        },
      })
    );

    const { value } = await valueChanged;
    // No legacy action to upgrade to: the original recipient must survive,
    // not get redirected to whichever of the device's entities resolves first
    expect(value.action).toBe("notify.send_message");
    expect(value.target).toEqual({ entity_id: "notify.jans_iphone_2" });
    expect(value.data?.message).toBe("The garage door is still open");
  });
});
