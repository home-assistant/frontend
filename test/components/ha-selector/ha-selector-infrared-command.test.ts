import { afterEach, describe, expect, it, vi } from "vitest";

import "../../../src/components/ha-selector/ha-selector-infrared-command";
import type { HaSelectorInfraredCommand } from "../../../src/components/ha-selector/ha-selector-infrared-command";
import type { InfraredCommand } from "../../../src/data/infrared";
import type { HomeAssistant } from "../../../src/types";

// The real components are Web Awesome based and do not upgrade in jsdom.
vi.mock("../../../src/components/ha-alert", () => {
  customElements.define("ha-alert", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-button", () => {
  customElements.define("ha-button", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-icon-button", () => {
  customElements.define("ha-icon-button", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-input-helper-text", () => {
  customElements.define("ha-input-helper-text", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-spinner", () => {
  customElements.define("ha-spinner", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/ha-svg-icon", () => {
  customElements.define("ha-svg-icon", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/input/ha-input", () => {
  customElements.define("ha-input", class extends HTMLElement {});
  return {};
});

const RECEIVER = "infrared.blaster_receiver";
const EMITTER = "infrared.blaster_emitter";

let subscriptions: {
  entityId: string;
  send: (message: { code: string }) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
}[] = [];

const hass = {
  localize: (key: string) => key,
  areas: {},
  devices: {},
  entities: {},
  states: {
    [RECEIVER]: { attributes: { device_class: "receiver" } },
    [EMITTER]: { attributes: { device_class: "emitter" } },
    "light.kitchen": { attributes: {} },
  },
  connection: {
    subscribeMessage: (
      callback: (message: { code: string }) => void,
      message: { entity_id: string }
    ) => {
      const unsubscribe = vi.fn();
      subscriptions.push({
        entityId: message.entity_id,
        send: callback,
        unsubscribe,
      });
      return Promise.resolve(unsubscribe);
    },
  },
} as unknown as HomeAssistant;

const mountSelector = async (
  value: InfraredCommand[] | undefined,
  entityIds: string[]
) => {
  const selector = document.createElement(
    "ha-selector-infrared_command"
  ) as HaSelectorInfraredCommand;
  selector.hass = hass;
  selector.selector = { infrared_command: {} };
  selector.value = value;
  selector.context = { filter_target: { entity_id: entityIds } };
  document.body.append(selector);
  await selector.updateComplete;
  return selector;
};

const capturedValues = (selector: HaSelectorInfraredCommand) => {
  const values: InfraredCommand[][] = [];
  selector.addEventListener("value-changed", (ev) => {
    values.push((ev as CustomEvent).detail.value);
  });
  return values;
};

const clickButton = async (
  selector: HaSelectorInfraredCommand,
  tag: string
) => {
  selector.shadowRoot!.querySelector<HTMLElement>(tag)!.click();
  await selector.updateComplete;
};

afterEach(() => {
  subscriptions = [];
  document.body.innerHTML = "";
});

describe("ha-selector-infrared_command", () => {
  it("only subscribes to the infrared receivers in the target", async () => {
    const selector = await mountSelector(undefined, [
      RECEIVER,
      EMITTER,
      "light.kitchen",
    ]);

    await clickButton(selector, "ha-button");
    await selector.updateComplete;

    expect(subscriptions.map((s) => s.entityId)).toEqual([RECEIVER]);
  });

  it("offers no way to capture without a receiver in the target", async () => {
    const selector = await mountSelector(undefined, ["light.kitchen"]);

    expect(selector.shadowRoot!.querySelector("ha-button")).toBeNull();
    expect(selector.shadowRoot!.querySelector("ha-alert")).not.toBeNull();
  });

  it("captures the first code only and stops listening", async () => {
    const selector = await mountSelector(undefined, [RECEIVER]);
    const values = capturedValues(selector);

    await clickButton(selector, "ha-button");
    await selector.updateComplete;
    subscriptions[0].send({ code: "0000 006d" });
    subscriptions[0].send({ code: "0000 1111" });
    await selector.updateComplete;

    expect(values).toEqual([
      [
        {
          name: "ui.components.selectors.infrared_command.captured_name",
          code: "0000 006d",
        },
      ],
    ]);
    expect(subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
  });

  it("stops listening when capturing is cancelled", async () => {
    const selector = await mountSelector(undefined, [RECEIVER]);
    const values = capturedValues(selector);

    await clickButton(selector, "ha-button");
    await selector.updateComplete;
    await clickButton(selector, "ha-button");
    subscriptions[0].send({ code: "0000 006d" });
    await selector.updateComplete;

    expect(values).toEqual([]);
    expect(subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
  });

  it("deletes the command the delete button belongs to", async () => {
    const commands = [
      { name: "Power", code: "0000 0001" },
      { name: "Volume up", code: "0000 0002" },
    ];
    const selector = await mountSelector(commands, [RECEIVER]);
    const values = capturedValues(selector);

    selector
      .shadowRoot!.querySelectorAll<HTMLElement>("ha-icon-button")[0]
      .click();

    expect(values).toEqual([[commands[1]]]);
  });
});
