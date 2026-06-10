import { describe, expect, it } from "vitest";
import {
  buildLogbookItem,
  classifyLogbookEntry,
  entityDisplay,
  resolveLogbookCause,
  resolveLogbookGlyph,
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
        source: "state of binary_sensor.porte",
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

  it("falls back to the raw platform key when untranslated", () => {
    const hass = baseHass({ localize: localizeStub() });
    const cause = resolveLogbookCause(
      hass,
      entry({ domain: "automation", source: "numeric state of sensor.temp" }),
      {}
    );
    expect(cause?.name).toBe("numeric_state");
    expect(cause?.triggerPlatform).toBe("numeric_state");
  });

  it("parses the English source for the trigger platform", () => {
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

describe("resolveLogbookGlyph", () => {
  it("returns the automation/script glyph for a run", () => {
    expect(
      resolveLogbookGlyph(
        entry({ entity_id: "automation.x", domain: "automation" }),
        "automation",
        undefined,
        "automation"
      )
    ).toEqual({ type: "automation", script: false });
    expect(
      resolveLogbookGlyph(
        entry({ entity_id: "script.x", domain: "script" }),
        "automation",
        undefined,
        "script"
      )
    ).toEqual({ type: "automation", script: true });
  });

  it("returns the entity state glyph when there is a historic state", () => {
    const historic = mockStateObj({ entity_id: "light.x" });
    expect(
      resolveLogbookGlyph(
        entry({ entity_id: "light.x", icon: "mdi:bulb" }),
        "entity",
        historic,
        "light"
      )
    ).toEqual({ type: "state", stateObj: historic, icon: "mdi:bulb" });
  });

  it("falls back to the integration brand glyph", () => {
    expect(
      resolveLogbookGlyph(
        entry({ domain: "zha", message: "x" }),
        "integration",
        undefined,
        "zha"
      )
    ).toEqual({ type: "brand", domain: "zha", icon: undefined });
  });
});

describe("buildLogbookItem", () => {
  it("builds an entity item (name, state as 'value', context, glyph)", () => {
    const hass = baseHass({
      localize: ((key: string) => key) as HomeAssistant["localize"],
      formatEntityState: ((_stateObj: any, state: string) =>
        state === "on"
          ? "Allumé"
          : state) as HomeAssistant["formatEntityState"],
      states: {
        "light.salon": mockStateObj({
          entity_id: "light.salon",
          attributes: { friendly_name: "Spots Salon" },
        }),
      },
      entities: {
        "light.salon": mockEntity({
          entity_id: "light.salon",
          name: "Spots Salon",
          device_id: "device_1",
        }),
      },
      devices: {
        device_1: mockDevice({
          id: "device_1",
          name: "Ampli",
          area_id: "area_1",
        }),
      },
      areas: { area_1: mockArea({ area_id: "area_1", name: "Salon" }) },
    });
    const model = buildLogbookItem(
      hass,
      entry({ entity_id: "light.salon", state: "on", when: 1000 }),
      {}
    );
    expect(model.category).toBe("entity");
    expect(model.name).toBe("Spots Salon");
    expect(model.context).toBe("Salon ▸ Ampli");
    expect(model.what).toEqual({ text: "Allumé", kind: "value" });
    expect(model.glyph.type).toBe("state");
    expect(model.when).toBe(1_000_000);
  });

  it("builds an automation item ('Triggered' value, automation glyph, trigger cause)", () => {
    const hass = baseHass({
      localize: ((key: string) =>
        ({
          "ui.components.logbook.automation_triggered": "Triggered",
          "ui.components.logbook.trigger_type.state": "State",
        })[key] ?? "") as HomeAssistant["localize"],
    });
    const model = buildLogbookItem(
      hass,
      entry({
        entity_id: "automation.x",
        domain: "automation",
        name: "Mode nuit",
        source: "state of binary_sensor.porte",
      }),
      {}
    );
    expect(model.category).toBe("automation");
    expect(model.name).toBe("Mode nuit");
    expect(model.context).toBeUndefined();
    expect(model.what).toEqual({ text: "Triggered", kind: "value" });
    expect(model.glyph).toEqual({ type: "automation", script: false });
    expect(model.cause?.name).toBe("State");
  });

  it("builds an integration item (message as 'phrase', brand glyph)", () => {
    const hass = baseHass({
      localize: (() => "") as HomeAssistant["localize"],
    });
    const model = buildLogbookItem(
      hass,
      entry({ domain: "zha", name: "Remote", message: "button pressed" }),
      {}
    );
    expect(model.category).toBe("integration");
    expect(model.name).toBe("Remote");
    expect(model.what).toEqual({ text: "button pressed", kind: "phrase" });
    expect(model.glyph).toEqual({
      type: "brand",
      domain: "zha",
      icon: undefined,
    });
    expect(model.cause).toBeUndefined();
  });

  it("shows 'Ran' for a script started by something else (context, no source)", () => {
    const hass = baseHass({
      localize: ((key: string) =>
        ({ "ui.components.logbook.script_ran": "Ran" })[key] ??
        "") as HomeAssistant["localize"],
    });
    const model = buildLogbookItem(
      hass,
      entry({
        entity_id: "script.x",
        domain: "script",
        message: "started",
        context_event_type: "automation_triggered",
        context_name: "Some automation",
      }),
      {}
    );
    expect(model.what).toEqual({ text: "Ran", kind: "value" });
  });
});
