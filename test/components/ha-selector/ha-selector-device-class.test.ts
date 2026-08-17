import "element-internals-polyfill";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../src/components/ha-selector/ha-selector-device-class";
import type { HaDeviceClassSelector } from "../../../src/components/ha-selector/ha-selector-device-class";

const mount = async (
  props: Partial<HaDeviceClassSelector>
): Promise<HaDeviceClassSelector> => {
  const el = document.createElement(
    "ha-selector-device_class"
  ) as HaDeviceClassSelector;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
};

describe("ha-selector-device-class", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("normalizes the selector before using the base select renderer", async () => {
    const el = await mount({
      hass: {
        loadBackendTranslation: vi.fn().mockResolvedValue(undefined),
        localize: (key: string) =>
          key === "component.sensor.entity_component.temperature.name"
            ? "Temperature"
            : "",
      } as any,
      selector: {
        device_class: {
          domain: "sensor",
          translation_key: "device_class",
          options: ["temperature", "humidity"],
        },
      } as any,
      value: "temperature",
    });

    expect(el.selector).toEqual({
      select: {
        domain: "sensor",
        translation_key: "device_class",
        options: ["temperature", "humidity"],
      },
    });
    expect(el.shadowRoot?.querySelector("ha-radio-group")).toBeTruthy();
  });

  it("loads the device class selector translations and localizes option labels", async () => {
    const loadBackendTranslation = vi.fn().mockResolvedValue(undefined);
    const el = await mount({
      hass: {
        loadBackendTranslation,
        localize: (key: string) =>
          key === "component.sensor.entity_component.temperature.name"
            ? "Temperature"
            : "",
      } as any,
      selector: {
        device_class: {
          options: ["temperature", "humidity"],
          domain: "sensor",
        },
      } as any,
      value: "temperature",
    });

    const options = Array.from(
      el.shadowRoot?.querySelectorAll("ha-radio-option") ?? []
    ) as unknown as { value: string; textContent: string | null }[];
    const label = options.find((option) => option.value === "temperature");
    expect(label?.textContent?.trim()).toBe("Temperature");
  });
});
