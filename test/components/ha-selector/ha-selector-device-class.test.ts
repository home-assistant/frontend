import "element-internals-polyfill";
import { ContextProvider } from "@lit/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../src/components/ha-selector/ha-selector-device-class";
import { internationalizationContext } from "../../../src/data/context";
import type { HaDeviceClassSelector } from "../../../src/components/ha-selector/ha-selector-device-class";

const mount = async (
  props: Partial<HaDeviceClassSelector>
): Promise<HaDeviceClassSelector> => {
  const el = document.createElement(
    "ha-selector-device_class"
  ) as HaDeviceClassSelector;
  Object.assign(el, props);
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: { locale: { language: "en" } } as any,
  });
  host.appendChild(el);
  await el.updateComplete;
  return el;
};

describe("ha-selector-device-class", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a select for the configured device class domain", async () => {
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
        },
      } as any,
      value: "temperature",
    });

    expect(el.selector).toEqual({
      device_class: {
        domain: "sensor",
      },
    });
    expect(el.shadowRoot?.querySelector("ha-select")).toBeTruthy();
  });

  it("loads the device selector translations and localizes option labels", async () => {
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
          domain: "sensor",
        },
      } as any,
      value: "temperature",
    });

    const select = el.shadowRoot?.querySelector("ha-select") as {
      options?: { value: string; label: string }[];
    };
    expect(select.options).toContainEqual({
      value: "temperature",
      label: "Temperature",
    });
  });
});
