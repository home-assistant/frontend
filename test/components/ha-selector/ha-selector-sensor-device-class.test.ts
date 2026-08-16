import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../src/components/ha-selector/ha-selector-sensor-device-class";
import type { HaSensorDeviceClassSelector } from "../../../src/components/ha-selector/ha-selector-sensor-device-class";
import { SENSOR_DEVICE_CLASSES } from "../../../src/data/sensor";

const mount = async (
  props: Partial<HaSensorDeviceClassSelector>
): Promise<HaSensorDeviceClassSelector> => {
  const el = document.createElement(
    "ha-selector-sensor_device_class"
  ) as HaSensorDeviceClassSelector;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
};

describe("ha-selector-sensor-device-class", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("normalizes the selector before using the base select renderer", async () => {
    const el = await mount({
      hass: {
        loadBackendTranslation: vi.fn().mockResolvedValue(undefined),
        localize: (key: string) =>
          key === "component.sensor.selector.device_class.options.temperature"
            ? "Temperature"
            : "",
      } as any,
      selector: {
        sensor_device_class: {
          options: ["temperature", "humidity"],
        },
      } as any,
      value: "temperature",
    });

    expect(el.selector).toEqual({
      select: {
        options: ["temperature", "humidity"],
        translation_key: "device_class",
      },
    });
    expect(el.shadowRoot?.querySelector("ha-radio-group")).toBeTruthy();
  });

  it("loads the sensor selector translations and localizes option labels", async () => {
    const loadBackendTranslation = vi.fn().mockResolvedValue(undefined);
    const el = await mount({
      hass: {
        loadBackendTranslation,
        localize: (key: string) =>
          key === "component.sensor.selector.device_class.options.temperature"
            ? "Temperature"
            : "",
      } as any,
      selector: {
        sensor_device_class: {
          options: ["temperature", "humidity"],
        },
      } as any,
      value: "temperature",
    });

    expect(loadBackendTranslation).toHaveBeenCalledWith("selector", "sensor");
    const label = el.shadowRoot?.querySelector(
      "ha-radio-option[value=temperature]"
    );
    expect(label?.textContent?.trim()).toBe("Temperature");
  });

  it("falls back to the full device class list when the backend provides no options", async () => {
    const el = await mount({
      hass: {
        loadBackendTranslation: vi.fn().mockResolvedValue(undefined),
        localize: () => "",
      } as any,
      selector: {
        sensor_device_class: {},
      } as any,
    });

    expect(el.selector).toEqual({
      select: {
        options: SENSOR_DEVICE_CLASSES,
        translation_key: "device_class",
      },
    });
  });
});
