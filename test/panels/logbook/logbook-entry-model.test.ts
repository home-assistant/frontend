import { describe, expect, it } from "vitest";
import {
  computeLogbookItem,
  computeTraceLink,
  classifyLogbookEntry,
  entityDisplay,
  computeLogbookCause,
  computeLogbookGlyph,
  findPreviousState,
  isSameLogbookEntry,
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

  it("shows 'Area ▸ Device' with no name detail (defaults to full)", () => {
    expect(entityDisplay(hass, "sensor.allee_battery")).toEqual({
      primary: "Battery state",
      secondary: "Allée ▸ Caméra Allée",
    });
  });

  it("shows 'Area ▸ Device' for the 'area' name detail", () => {
    expect(entityDisplay(hass, "sensor.allee_battery", "area")).toEqual({
      primary: "Battery state",
      secondary: "Allée ▸ Caméra Allée",
    });
  });

  it("shows the device only for the 'device' name detail", () => {
    expect(entityDisplay(hass, "sensor.allee_battery", "device")).toEqual({
      primary: "Battery state",
      secondary: "Caméra Allée",
    });
  });

  it("shows no context for the 'entity' name detail", () => {
    expect(entityDisplay(hass, "sensor.allee_battery", "entity")).toEqual({
      primary: "Battery state",
      secondary: undefined,
    });
  });

  it("shows no context for the 'none' name detail", () => {
    expect(entityDisplay(hass, "sensor.allee_battery", "none")).toEqual({
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

describe("computeLogbookCause", () => {
  const localizeStub = (table: Record<string, string> = {}) =>
    ((key: string) => table[key] ?? "") as HomeAssistant["localize"];

  it("uses state kind and entity id as name when source names an entity", () => {
    const hass = baseHass({ localize: localizeStub() });
    const cause = computeLogbookCause(
      hass,
      entry({
        domain: "automation",
        source: "state of binary_sensor.porte",
      }),
      {}
    );
    expect(cause?.type).toBe("state");
    // Entity not in hass.states — falls back to entity id
    expect(cause?.name).toBe("binary_sensor.porte");
    expect(cause?.entityId).toBe("binary_sensor.porte");
  });

  it("labels a service call with the domain name and integration kind", () => {
    const hass = baseHass({
      localize: localizeStub({
        "component.light.title": "Light",
      }),
    });
    const cause = computeLogbookCause(
      hass,
      entry({
        context_event_type: "call_service",
        context_domain: "light",
        context_service: "turn_on",
      }),
      {}
    );
    expect(cause?.type).toBe("integration");
    expect(cause?.name).toBe("Light");
    expect(cause?.brandDomain).toBe("light");
  });

  it("uses entity id as name when source entity is not in hass", () => {
    const hass = baseHass({ localize: localizeStub() });
    const cause = computeLogbookCause(
      hass,
      entry({ domain: "automation", source: "numeric state of sensor.temp" }),
      {}
    );
    expect(cause?.type).toBe("state");
    expect(cause?.name).toBe("sensor.temp");
  });

  it("uses scheduled kind for time-based triggers", () => {
    const hass = baseHass({ localize: localizeStub() });
    const cause = computeLogbookCause(
      hass,
      entry({ domain: "automation", source: "time pattern" }),
      {}
    );
    expect(cause?.type).toBe("scheduled");
  });

  it("flags a system user when its id is in the system set", () => {
    const hass = baseHass({ localize: localizeStub() });
    const cause = computeLogbookCause(
      hass,
      entry({ context_user_id: "cloud_user" }),
      { cloud_user: "Home Assistant Cloud" },
      new Set(["cloud_user"])
    );
    expect(cause?.type).toBe("user");
    expect(cause?.name).toBe("Home Assistant Cloud");
    expect(cause?.systemUser).toBe(true);
  });

  it("does not flag a regular user as a system user", () => {
    const hass = baseHass({ localize: localizeStub() });
    const cause = computeLogbookCause(
      hass,
      entry({ context_user_id: "person_1" }),
      { person_1: "Alice" },
      new Set(["cloud_user"])
    );
    expect(cause?.type).toBe("user");
    expect(cause?.systemUser).toBe(false);
  });
});

describe("computeLogbookGlyph", () => {
  it("returns the automation/script glyph for a run", () => {
    expect(
      computeLogbookGlyph(
        entry({ entity_id: "automation.x", domain: "automation" }),
        "automation",
        undefined,
        "automation"
      )
    ).toEqual({ type: "automation", script: false });
    expect(
      computeLogbookGlyph(
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
      computeLogbookGlyph(
        entry({ entity_id: "light.x", icon: "mdi:bulb" }),
        "entity",
        historic,
        "light"
      )
    ).toEqual({ type: "state", stateObj: historic, icon: "mdi:bulb" });
  });

  it("falls back to the integration brand glyph", () => {
    expect(
      computeLogbookGlyph(
        entry({ domain: "zha", message: "x" }),
        "integration",
        undefined,
        "zha"
      )
    ).toEqual({ type: "brand", domain: "zha", icon: undefined });
  });
});

describe("computeLogbookItem", () => {
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
    const model = computeLogbookItem(
      hass,
      entry({ entity_id: "light.salon", state: "on", when: 1000 }),
      {}
    );
    expect(model.category).toBe("entity");
    expect(model.name).toBe("Spots Salon");
    expect(model.context).toBe("Salon ▸ Ampli");
    expect(model.value).toEqual({ text: "Allumé", type: "state" });
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
    const model = computeLogbookItem(
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
    expect(model.value).toEqual({ text: "Triggered", type: "state" });
    expect(model.glyph).toEqual({ type: "automation", script: false });
    expect(model.cause?.type).toBe("state");
    expect(model.cause?.name).toBe("binary_sensor.porte");
  });

  it("builds an integration item (message as 'phrase', brand glyph)", () => {
    const hass = baseHass({
      localize: (() => "") as HomeAssistant["localize"],
    });
    const model = computeLogbookItem(
      hass,
      entry({ domain: "zha", name: "Remote", message: "button pressed" }),
      {}
    );
    expect(model.category).toBe("integration");
    expect(model.name).toBe("Remote");
    expect(model.value).toEqual({ text: "button pressed", type: "message" });
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
    const model = computeLogbookItem(
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
    expect(model.value).toEqual({ text: "Ran", type: "state" });
  });
});

describe("findPreviousState", () => {
  const entries: LogbookEntry[] = [
    entry({ when: 5, entity_id: "light.x", state: "on" }),
    entry({ when: 4, entity_id: "sensor.y", state: "42" }),
    entry({ when: 3, entity_id: "automation.z", domain: "automation" }),
    entry({ when: 2, entity_id: "light.x", state: "off" }),
    entry({ when: 1, entity_id: "light.x", state: "on" }),
  ];

  it("returns the nearest older state of the same entity", () => {
    expect(findPreviousState(entries, 0)).toBe("off");
    expect(findPreviousState(entries, 3)).toBe("on");
  });

  it("skips entries of other entities", () => {
    expect(findPreviousState(entries, 1)).toBeUndefined();
  });

  it("skips state-less entries of the same entity", () => {
    const list = [
      entry({ when: 3, entity_id: "automation.z", state: "on" }),
      entry({ when: 2, entity_id: "automation.z", domain: "automation" }),
      entry({ when: 1, entity_id: "automation.z", state: "off" }),
    ];
    expect(findPreviousState(list, 0)).toBe("off");
  });

  it("returns undefined at the end of the list", () => {
    expect(findPreviousState(entries, 4)).toBeUndefined();
  });

  it("returns undefined without an entity or for an out-of-range index", () => {
    expect(findPreviousState(entries, 2)).toBeUndefined();
    expect(findPreviousState(entries, 99)).toBeUndefined();
    expect(findPreviousState([], 0)).toBeUndefined();
  });
});

describe("isSameLogbookEntry", () => {
  const a = entry({
    when: 1.234567,
    entity_id: "light.x",
    state: "on",
    name: "Light",
  });

  it("matches an identical entry", () => {
    expect(isSameLogbookEntry(a, { ...a })).toBe(true);
  });

  it("rejects an entry differing by any field", () => {
    expect(isSameLogbookEntry(a, { ...a, when: 1.234568 })).toBe(false);
    expect(isSameLogbookEntry(a, { ...a, entity_id: "light.y" })).toBe(false);
    expect(isSameLogbookEntry(a, { ...a, state: "off" })).toBe(false);
    expect(isSameLogbookEntry(a, { ...a, name: "Other" })).toBe(false);
    expect(isSameLogbookEntry(a, { ...a, message: "turned on" })).toBe(false);
  });

  it("matches entity-less entries on name/message/when", () => {
    const b = entry({ when: 2, name: "HACS", message: "2 updates available" });
    expect(isSameLogbookEntry(b, { ...b })).toBe(true);
    expect(isSameLogbookEntry(b, { ...b, message: "other" })).toBe(false);
  });
});

describe("computeTraceLink", () => {
  const traceContexts = {
    ctx_1: { run_id: "run_9", domain: "automation", item_id: "auto_1" },
  };

  it("builds the trace URL for a known context", () => {
    expect(computeTraceLink(traceContexts, "ctx_1")).toBe(
      "/config/automation/trace/auto_1?run_id=run_9"
    );
  });

  it("returns undefined for an unknown or missing context", () => {
    expect(computeTraceLink(traceContexts, "ctx_2")).toBeUndefined();
    expect(computeTraceLink(traceContexts, undefined)).toBeUndefined();
    expect(computeTraceLink({}, "ctx_1")).toBeUndefined();
  });
});

describe("computeLogbookItem cause", () => {
  const hass = baseHass({ localize: (() => "") as HomeAssistant["localize"] });
  const users = { user_1: "Alice" };

  it("prefers the automation over the user who ran it", () => {
    const model = computeLogbookItem(
      hass,
      entry({
        entity_id: "light.ceiling",
        state: "on",
        context_user_id: "user_1",
        context_event_type: "automation_triggered",
        context_entity_id: "automation.wake_up",
        context_name: "Wake up",
      }),
      { userIdToName: users }
    );
    expect(model.cause?.type).toBe("automation");
    expect(model.cause?.name).toBe("Wake up");
  });

  it("keeps the user for a direct action call", () => {
    const model = computeLogbookItem(
      hass,
      entry({
        entity_id: "light.ceiling",
        state: "on",
        context_user_id: "user_1",
        context_event_type: "call_service",
        context_domain: "light",
        context_service: "turn_on",
      }),
      { userIdToName: users }
    );
    expect(model.cause?.type).toBe("user");
    expect(model.cause?.name).toBe("Alice");
  });

  it("falls back to the context cause without a user", () => {
    const model = computeLogbookItem(
      hass,
      entry({
        entity_id: "light.ceiling",
        state: "on",
        context_event_type: "automation_triggered",
        context_name: "Wake up",
      }),
      { userIdToName: users }
    );
    expect(model.cause?.type).toBe("automation");
  });

  it("leaves the cause empty without any context", () => {
    const model = computeLogbookItem(
      hass,
      entry({ entity_id: "light.ceiling", state: "on" }),
      { userIdToName: users }
    );
    expect(model.cause).toBeUndefined();
  });
});

describe("computeLogbookItem run rows", () => {
  it("uses the run label instead of the raw backend message", () => {
    const hass = baseHass({
      localize: ((key: string) => key) as HomeAssistant["localize"],
    });
    const model = computeLogbookItem(
      hass,
      entry({
        entity_id: "automation.wake_up",
        domain: "automation",
        name: "Wake up",
        message: "triggered",
      }),
      {}
    );
    expect(model.value).toEqual({
      text: "ui.components.logbook.automation_triggered",
      type: "state",
    });
  });
});
