import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/entity-rows/hui-number-entity-row";
import { createMockEntityState, createMockHass } from "../../../fixtures/hass";

class MockResizeObserver {
  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

beforeAll(() => {
  const internalsProto = window.ElementInternals.prototype as any;
  internalsProto.setValidity = vi.fn();
  internalsProto.setFormValue = vi.fn();
  internalsProto.checkValidity = () => true;
  internalsProto.reportValidity = () => true;
  internalsProto.states = new Set();
  Object.defineProperty(internalsProto, "validity", {
    get: () => ({ valid: true }),
    configurable: true,
  });
});

const numberHass = (mode: string) =>
  createMockHass({
    "number.threshold": createMockEntityState("number.threshold", "5.0", {
      min: 0,
      max: 10,
      step: 1,
      mode,
    }),
  });

const mountRow = async (mode: string) => {
  const row = document.createElement("hui-number-entity-row") as any;
  row.setConfig({ entity: "number.threshold" });
  row.hass = numberHass(mode);
  document.body.append(row);
  await row.updateComplete;
  return row;
};

describe("hui-number-entity-row", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the entity's value again when a change in the box ends on the same value", async () => {
    const row = await mountRow("box");
    const input = row.shadowRoot.querySelector("ha-input");
    input.value = "8";
    row.hass = numberHass("box");
    await row.updateComplete;
    expect(input.value).toBe("5");
  });

  it("shows the entity's value again when a change on the slider ends on the same value", async () => {
    const row = await mountRow("slider");
    const slider = row.shadowRoot.querySelector("ha-slider");
    slider.value = 8;
    row.hass = numberHass("slider");
    await row.updateComplete;
    expect(slider.value).toBe(5);
  });
});
