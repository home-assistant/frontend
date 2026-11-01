import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/components/ha-labeled-slider";

vi.mock("../../src/components/ha-slider", () => {
  customElements.define("ha-slider", class extends HTMLElement {});
  return {};
});

vi.mock("../../src/components/ha-icon", () => {
  customElements.define("ha-icon", class extends HTMLElement {});
  return {};
});

vi.mock("../../src/components/ha-input-helper-text", () => {
  customElements.define("ha-input-helper-text", class extends HTMLElement {});
  return {};
});

describe("ha-labeled-slider", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("names the slider after its caption", async () => {
    const element = document.createElement("ha-labeled-slider");
    element.caption = "White brightness";
    document.body.append(element);
    await element.updateComplete;

    const slider = element.shadowRoot!.querySelector("ha-slider");

    expect(
      (slider as unknown as { accessibleLabel: string }).accessibleLabel
    ).toBe("White brightness");
  });
});
