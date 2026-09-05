import { afterEach, describe, expect, it, vi } from "vitest";

import "../../../src/components/ha-selector/ha-selector-infrared-command-name";
import type { HaSelectorInfraredCommandName } from "../../../src/components/ha-selector/ha-selector-infrared-command-name";
import type { AutomationConfig } from "../../../src/data/automation";
import type { HomeAssistant } from "../../../src/types";

// ha-selector pulls in every selector implementation, so stand in for it and
// read back the select it is handed.
vi.mock("../../../src/components/ha-selector/ha-selector", () => {
  customElements.define(
    "ha-selector",
    class extends HTMLElement {
      public selector?: unknown;
    }
  );
  return {};
});

const hass = { localize: (key: string) => key } as unknown as HomeAssistant;

const INFRARED_TRIGGER = {
  trigger: "infrared",
  target: { entity_id: "infrared.blaster_receiver" },
  options: {
    commands: [
      { name: "Power", code: "0000 0001" },
      { name: "Volume up", code: "0000 0002" },
    ],
  },
};

const mountSelector = async (
  config: Partial<AutomationConfig> | undefined,
  value?: string[]
) => {
  const selector = document.createElement(
    "ha-selector-infrared_command_name"
  ) as HaSelectorInfraredCommandName;
  selector.hass = hass;
  selector.selector = { infrared_command_name: {} };
  selector.value = value;
  document.body.addEventListener("subscribe-automation-config", (ev) => {
    const { detail } = ev as CustomEvent;
    detail.unsub = () => undefined;
    detail.callback(config);
  });
  document.body.append(selector);
  await selector.updateComplete;
  return selector;
};

const offeredOptions = (selector: HaSelectorInfraredCommandName) => {
  const inner = selector.shadowRoot!.querySelector("ha-selector") as
    (HTMLElement & { selector?: { select: { options: string[] } } }) | null;
  return inner?.selector?.select.options;
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ha-selector-infrared_command_name", () => {
  it("offers the command names the automation's infrared triggers captured", async () => {
    const selector = await mountSelector({
      triggers: [
        { trigger: "state", entity_id: "light.kitchen" },
        INFRARED_TRIGGER,
      ],
    } as unknown as AutomationConfig);

    expect(offeredOptions(selector)).toEqual(["Power", "Volume up"]);
  });

  it("looks inside trigger lists and drops duplicate names", async () => {
    const selector = await mountSelector({
      triggers: [
        { triggers: [INFRARED_TRIGGER] },
        { ...INFRARED_TRIGGER, target: { entity_id: "infrared.other" } },
      ],
    } as unknown as AutomationConfig);

    expect(offeredOptions(selector)).toEqual(["Power", "Volume up"]);
  });

  it("keeps a configured name that no trigger captures any more", async () => {
    const selector = await mountSelector(
      { triggers: [INFRARED_TRIGGER] } as unknown as AutomationConfig,
      ["Mute"]
    );

    expect(offeredOptions(selector)).toEqual(["Power", "Volume up", "Mute"]);
  });

  it("explains itself when there is nothing to pick", async () => {
    const selector = await mountSelector({
      triggers: [{ trigger: "state", entity_id: "light.kitchen" }],
    } as unknown as AutomationConfig);

    expect(offeredOptions(selector)).toBeUndefined();
    expect(selector.shadowRoot!.textContent).toContain(
      "ui.components.selectors.infrared_command_name.no_commands"
    );
  });
});
