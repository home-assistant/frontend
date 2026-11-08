import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SirenEntityFeature } from "../../../src/data/siren";

class HaInputStub extends HTMLElement {
  public value?: string;
}

// Stub the dialog's children so the test reads what it passes to the inputs.
vi.mock("../../../src/components/input/ha-input", () => {
  if (!customElements.get("ha-input")) {
    customElements.define(
      "ha-input",
      HaInputStub as unknown as CustomElementConstructor
    );
  }
  return {};
});
vi.mock("../../../src/components/ha-button", () => ({}));
vi.mock("../../../src/components/ha-control-button", () => ({}));
vi.mock("../../../src/components/ha-dialog", () => ({}));
vi.mock("../../../src/components/ha-dialog-footer", () => ({}));
vi.mock("../../../src/components/ha-icon-button", () => ({}));
vi.mock("../../../src/components/ha-select", () => ({}));

type SirenControls = HTMLElement & {
  hass: unknown;
  showDialog(params: { stateObj: unknown }): void;
  updateComplete: Promise<boolean>;
};

beforeAll(async () => {
  await import("../../../src/dialogs/more-info/components/siren/ha-more-info-siren-advanced-controls");
});

describe("<ha-more-info-siren-advanced-controls>", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  const enterVolume = async (typed: string) => {
    const element = document.createElement(
      "ha-more-info-siren-advanced-controls"
    ) as SirenControls;
    element.hass = { localize: (key: string) => key };
    document.body.append(element);
    element.showDialog({
      stateObj: {
        entity_id: "siren.alarm",
        state: "off",
        attributes: { supported_features: SirenEntityFeature.VOLUME_SET },
      },
    });
    await element.updateComplete;

    const input = element.shadowRoot!.querySelector("ha-input") as HaInputStub;
    input.value = typed;
    input.dispatchEvent(new Event("change"));
    await element.updateComplete;
    return input.value;
  };

  it.each(["7", "29", "57"])(
    "shows a typed volume of %s%% unchanged",
    async (typed) => {
      expect(await enterVolume(typed)).toBe(typed);
    }
  );
});
