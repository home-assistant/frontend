import { describe, expect, it } from "vitest";
import {
  classifyLogbookEntry,
  entityDisplay,
  resolveLogbookCause,
} from "../../../src/panels/logbook/logbook-entry-model";
import type { LogbookEntry } from "../../../src/data/logbook";
import type { HomeAssistant } from "../../../src/types";
import {
  mockArea,
  mockDevice,
  mockEntity,
  mockStateObj,
} from "../../common/entity/context/context-mock";

const baseHass = (partial: Partial<HomeAssistant>): HomeAssistant =>
  ({
    language: "en",
    translationMetadata: { translations: {} },
    states: {},
    entities: {},
    devices: {},
    areas: {},
    floors: {},
    ...partial,
  }) as unknown as HomeAssistant;

const entry = (partial: Partial<LogbookEntry>): LogbookEntry => ({
  when: 0,
  name: "",
  ...partial,
});

describe("classifyLogbookEntry", () => {
  it("classifies an entity state change as 'entity'", () => {
    expect(
      classifyLogbookEntry(entry({ entity_id: "light.x", state: "on" }))
    ).toBe("entity");
  });

  it("classifies an automation/script run as 'automation'", () => {
    expect(
      classifyLogbookEntry(
        entry({
          entity_id: "automation.x",
          domain: "automation",
          source: "time",
        })
      )
    ).toBe("automation");
    expect(
      classifyLogbookEntry(entry({ entity_id: "script.x", domain: "script" }))
    ).toBe("automation");
  });

  it("treats turning an automation on/off as an entity state change", () => {
    expect(
      classifyLogbookEntry(
        entry({ entity_id: "automation.x", domain: "automation", state: "on" })
      )
    ).toBe("entity");
  });

  it("classifies an integration/app event (message, no state) as 'integration'", () => {
    expect(
      classifyLogbookEntry(
        entry({ domain: "hacs", message: "2 updates available" })
      )
    ).toBe("integration");
  });
});

describe("entityDisplay", () => {
  const hass = baseHass({
    states: {
      "sensor.allee_battery": mockStateObj({
        entity_id: "sensor.allee_battery",
        attributes: { friendly_name: "Caméra Allée Battery state" },
      }),
    },
    entities: {
      "sensor.allee_battery": mockEntity({
        entity_id: "sensor.allee_battery",
        name: "Battery state",
        device_id: "device_1",
      }),
    },
    devices: {
      device_1: mockDevice({
        id: "device_1",
        name: "Caméra Allée",
        area_id: "area_1",
      }),
    },
    areas: { area_1: mockArea({ area_id: "area_1", name: "Allée" }) },
  });

  it("shows 'Area ▸ Device' with no scope", () => {
    expect(entityDisplay(hass, "sensor.allee_battery")).toEqual({
      primary: "Battery state",
      secondary: "Allée ▸ Caméra Allée",
    });
  });

  it("shows device only in an area-scoped logbook", () => {
    expect(entityDisplay(hass, "sensor.allee_battery", "area")).toEqual({
      primary: "Battery state",
      secondary: "Caméra Allée",
    });
  });

  it("shows no context in a device-scoped logbook", () => {
    expect(entityDisplay(hass, "sensor.allee_battery", "device")).toEqual({
      primary: "Battery state",
      secondary: undefined,
    });
  });

  it("shows no context in an entity-scoped logbook", () => {
    expect(entityDisplay(hass, "sensor.allee_battery", "entity")).toEqual({
      primary: "Battery state",
      secondary: undefined,
    });
  });

  it("drops the device from context when the entity uses the device name", () => {
    const h = baseHass({
      states: { "sensor.desk": mockStateObj({ entity_id: "sensor.desk" }) },
      entities: {
        "sensor.desk": mockEntity({
          entity_id: "sensor.desk",
          device_id: "device_1",
        }),
      },
      devices: {
        device_1: mockDevice({
          id: "device_1",
          name: "Desk",
          area_id: "area_1",
        }),
      },
      areas: { area_1: mockArea({ area_id: "area_1", name: "Office" }) },
    });
    // entity has no own name -> primary is the device name, context is area only
    expect(entityDisplay(h, "sensor.desk")).toEqual({
      primary: "Desk",
      secondary: "Office",
    });
  });

  it("returns an empty display for a deleted entity", () => {
    expect(entityDisplay(baseHass({}), "light.removed")).toEqual({});
  });
});

describe("resolveLogbookCause", () => {
  const localizeStub = (table: Record<string, string> = {}) =>
    ((key: string) => table[key] ?? "") as HomeAssistant["localize"];

  it("uses the trigger type (icon + name), not the entity it fired on", () => {
    const hass = baseHass({
      localize: localizeStub({
        "ui.components.logbook.trigger_type.state": "State",
      }),
    });
    const cause = resolveLogbookCause(
      hass,
      entry({
        domain: "automation",
        source: "state of something.else",
        trigger: { trigger: "state", entity_id: "binary_sensor.porte" },
      }),
      {}
    );
    expect(cause?.name).toBe("State");
    expect(cause?.triggerPlatform).toBe("state");
  });

  it("labels a service call with the action name and integration icon", () => {
    const hass = baseHass({
      localize: localizeStub({
        "component.light.title": "Light",
        "component.light.services.turn_on.name": "Turn on",
      }),
    });
    const cause = resolveLogbookCause(
      hass,
      entry({
        context_event_type: "call_service",
        context_domain: "light",
        context_service: "turn_on",
      }),
      {}
    );
    expect(cause?.name).toBe("Light: Turn on");
    expect(cause?.brandDomain).toBe("light");
  });

  it("prefers the trigger alias when present", () => {
    const hass = baseHass({ localize: localizeStub() });
    const cause = resolveLogbookCause(
      hass,
      entry({
        domain: "automation",
        trigger: {
          trigger: "state",
          entity_id: "binary_sensor.porte",
          alias: "Quand la porte s'ouvre",
        },
      }),
      {}
    );
    expect(cause?.name).toBe("Quand la porte s'ouvre");
    expect(cause?.triggerPlatform).toBe("state");
  });

  it("labels a structured platform trigger via localize", () => {
    const hass = baseHass({
      localize: localizeStub({
        "ui.components.logbook.trigger_type.time": "Time",
      }),
    });
    const cause = resolveLogbookCause(
      hass,
      entry({ domain: "automation", trigger: { trigger: "time" } }),
      {}
    );
    expect(cause?.name).toBe("Time");
    expect(cause?.triggerPlatform).toBe("time");
  });

  it("falls back to the bare platform key for an unknown platform", () => {
    const hass = baseHass({ localize: localizeStub() });
    const cause = resolveLogbookCause(
      hass,
      entry({ domain: "automation", trigger: { trigger: "sun" } }),
      {}
    );
    expect(cause?.name).toBe("sun");
    expect(cause?.triggerPlatform).toBe("sun");
  });

  it("localizes an integration trigger via backend translations", () => {
    const hass = baseHass({
      localize: localizeStub({
        "component.sensor.triggers.temperature_changed.name":
          "Temperature changed",
      }),
    });
    const cause = resolveLogbookCause(
      hass,
      entry({
        domain: "automation",
        trigger: { trigger: "sensor.temperature_changed" },
      }),
      {}
    );
    expect(cause?.name).toBe("Temperature changed");
    expect(cause?.triggerPlatform).toBe("sensor.temperature_changed");
  });

  it("falls back to parsing the English source on older backends", () => {
    const hass = baseHass({
      localize: localizeStub({
        "ui.components.logbook.trigger_type.time_pattern": "Time pattern",
      }),
    });
    const cause = resolveLogbookCause(
      hass,
      entry({ domain: "automation", source: "time pattern" }),
      {}
    );
    expect(cause?.name).toBe("Time pattern");
  });
});
