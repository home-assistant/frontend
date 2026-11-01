import { ContextProvider } from "@lit/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { internationalizationContext } from "../../../src/data/context";
import type { HomeAssistantInternationalization } from "../../../src/types";
import type { HaColorRGBWSelector } from "../../../src/components/ha-selector/ha-selector-color-rgbw";
import "../../../src/components/ha-selector/ha-selector-color-rgbw";

vi.mock("../../../src/components/ha-labeled-slider", () => {
  customElements.define("ha-labeled-slider", class extends HTMLElement {});
  return {};
});

vi.mock("../../../src/components/input/ha-input", () => {
  customElements.define("ha-input", class extends HTMLElement {});
  return {};
});

const mountSelector = async (value?: HaColorRGBWSelector["value"]) => {
  const host = document.createElement("div");
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: {
      localize: (key: string) => key,
      locale: { language: "en" },
    } as unknown as HomeAssistantInternationalization,
  });
  const selector = document.createElement(
    "ha-selector-color_rgbw"
  ) as HaColorRGBWSelector;
  selector.value = value;
  const values: unknown[] = [];
  selector.addEventListener("value-changed", (ev) => {
    values.push((ev as CustomEvent).detail.value);
  });
  host.append(selector);
  document.body.append(host);
  await selector.updateComplete;
  return { selector, values };
};

const changeColor = (selector: HaColorRGBWSelector, hex: string) => {
  const input = selector.shadowRoot!.querySelector("ha-input")!;
  (input as unknown as { value: string }).value = hex;
  input.dispatchEvent(new CustomEvent("change"));
};

const changeWhite = (selector: HaColorRGBWSelector, percentage: number) => {
  selector.shadowRoot!.querySelector("ha-labeled-slider")!.dispatchEvent(
    new CustomEvent("value-changed", {
      detail: { value: percentage },
      bubbles: true,
      composed: true,
    })
  );
};

describe("ha-selector-color_rgbw", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps white when the color changes", async () => {
    const { selector, values } = await mountSelector([1, 2, 3, 77]);

    changeColor(selector, "#ff8000");

    expect(values).toEqual([[255, 128, 0, 77]]);
  });

  it("keeps the color and reports white in 0-255", async () => {
    const { selector, values } = await mountSelector([10, 20, 30, 77]);

    changeWhite(selector, 50);

    expect(values).toEqual([[10, 20, 30, 128]]);
  });

  it("starts from black when there is no value", async () => {
    const { selector, values } = await mountSelector();

    changeWhite(selector, 100);

    expect(values).toEqual([[0, 0, 0, 255]]);
  });

  it("shows white as a percentage", async () => {
    const { selector } = await mountSelector([0, 0, 0, 128]);

    const slider = selector.shadowRoot!.querySelector("ha-labeled-slider");

    expect((slider as unknown as { value: number }).value).toBe(50);
  });
});
