import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { HaLocationSelector } from "../../../src/components/ha-selector/ha-selector-location";
import type {
  LocationSelector,
  LocationSelectorValue,
} from "../../../src/data/selector";

// Stub the map and the form so the test drives the form's value-changed.
vi.mock("../../../src/components/map/ha-locations-editor", () => ({}));
vi.mock("../../../src/components/ha-form/ha-form", () => ({}));

beforeAll(async () => {
  await import("../../../src/components/ha-selector/ha-selector-location");
});

describe("<ha-selector-location>", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  const editInForm = async (
    location: LocationSelector["location"],
    value: LocationSelectorValue,
    formValue: Record<string, unknown>
  ) => {
    const element = document.createElement(
      "ha-selector-location"
    ) as HaLocationSelector;
    element.hass = {
      config: { latitude: 52, longitude: 4 },
      localize: (key: string) => key,
    } as any;
    element.selector = { location };
    element.value = value;
    document.body.append(element);
    await element.updateComplete;

    const emitted: unknown[] = [];
    element.addEventListener("value-changed", (ev) => {
      emitted.push((ev as CustomEvent).detail.value);
    });
    element
      .shadowRoot!.querySelector("ha-form")!
      .dispatchEvent(
        new CustomEvent("value-changed", { detail: { value: formValue } })
      );
    return emitted[0];
  };

  it("rounds an edited radius", async () => {
    expect(
      await editInForm(
        { radius: true },
        { latitude: 1, longitude: 2, radius: 500 },
        { latitude: 1, longitude: 2, radius: 600.4 }
      )
    ).toEqual({ latitude: 1, longitude: 2, radius: 600 });
  });

  it("does not emit a NaN radius when the value has none", async () => {
    expect(
      await editInForm(
        { radius: true },
        { latitude: 1, longitude: 2 },
        { latitude: 3, longitude: 2 }
      )
    ).toEqual({ latitude: 3, longitude: 2 });
  });

  it("keeps a read-only radius when the coordinates are edited", async () => {
    expect(
      await editInForm(
        { radius: true, radius_readonly: true },
        { latitude: 1, longitude: 2, radius: 500 },
        { latitude: 3, longitude: 2, radius: 500 }
      )
    ).toEqual({ latitude: 3, longitude: 2, radius: 500 });
  });

  it("leaves the radius out when the selector has none", async () => {
    expect(
      await editInForm(
        {},
        { latitude: 1, longitude: 2 },
        { latitude: 3, longitude: 2 }
      )
    ).toEqual({ latitude: 3, longitude: 2 });
  });
});
