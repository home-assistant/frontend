import { describe, expect, it } from "vitest";
import {
  mockArea,
  mockDevice,
  mockEntity,
  mockStateObj,
} from "../../common/entity/context/context-mock";
import { computeMoreInfoHeader } from "../../../src/dialogs/more-info/compute-more-info-header";
import type { HomeAssistant } from "../../../src/types";

const hassWith = (overrides: Partial<HomeAssistant>): HomeAssistant =>
  ({
    states: {},
    entities: {},
    devices: {},
    areas: {},
    floors: {},
    language: "en",
    translationMetadata: { translations: { he: { isRTL: true } } },
    ...overrides,
  }) as unknown as HomeAssistant;

const kitchenLight = () =>
  hassWith({
    states: {
      "light.kitchen": mockStateObj({
        entity_id: "light.kitchen",
        attributes: { friendly_name: "Kitchen Light" },
      }),
    },
    entities: {
      "light.kitchen": mockEntity({
        entity_id: "light.kitchen",
        name: "Light",
        device_id: "dev1",
        area_id: "kitchen",
      }),
    },
    devices: {
      dev1: mockDevice({
        id: "dev1",
        name: "Smart Device",
        area_id: "kitchen",
      }),
    },
    areas: {
      kitchen: mockArea({ area_id: "kitchen", name: "Kitchen" }),
    },
  });

describe("computeMoreInfoHeader", () => {
  it("names the entity and puts its area and device in the subtitle", () => {
    expect(computeMoreInfoHeader(kitchenLight(), "light.kitchen")).toEqual({
      title: "Light",
      subtitle: "Kitchen ▸ Smart Device",
    });
  });

  it("reverses the breadcrumb arrow for a right-to-left language", () => {
    const hass = kitchenLight();
    hass.language = "he";

    expect(computeMoreInfoHeader(hass, "light.kitchen").subtitle).toBe(
      "Kitchen ◂ Smart Device"
    );
  });

  it("leaves the subtitle out for an entity with nothing above it", () => {
    const hass = hassWith({
      states: {
        "sensor.outside": mockStateObj({
          entity_id: "sensor.outside",
          attributes: { friendly_name: "Outside" },
        }),
      },
    });

    expect(computeMoreInfoHeader(hass, "sensor.outside")).toEqual({
      title: "Outside",
    });
  });

  // Like the dialog, an entity the frontend has no state for shows its id.
  it("falls back to the entity id without a state", () => {
    expect(computeMoreInfoHeader(hassWith({}), "light.gone")).toEqual({
      title: "light.gone",
    });
  });
});
