import { describe, expect, it } from "vitest";
import type { HassServices } from "home-assistant-js-websocket";
import { portAction, portTrigger } from "../../src/data/automation_replace";
import type { TriggerDescriptions } from "../../src/data/trigger";
import type { HomeAssistant } from "../../src/types";
import { createMockEntityState, createMockHass } from "../fixtures/hass";

// Frozen inputs make any mutation of the old or new item throw.
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const lightTarget = { entity: [{ domain: "light" }] };

const services = {
  light: {
    turn_on: {
      target: lightTarget,
      fields: {
        transition: {
          selector: {
            number: { min: 0, max: 300, unit_of_measurement: "seconds" },
          },
        },
        brightness_pct: {
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
        flash: { selector: { select: { options: ["short", "long"] } } },
        effect: { selector: { text: null } },
      },
    },
    turn_off: {
      target: lightTarget,
      fields: {
        // A section only groups fields, its values stay at the top level.
        advanced_fields: {
          collapsed: true,
          fields: {
            transition: {
              selector: {
                number: { min: 0, max: 300, unit_of_measurement: "seconds" },
              },
            },
          },
        },
      },
    },
    toggle: {
      target: lightTarget,
      fields: {
        transition: {
          selector: {
            number: { min: 0, max: 300, unit_of_measurement: "seconds" },
          },
        },
        brightness_pct: {
          selector: { number: { min: 0, max: 40, unit_of_measurement: "%" } },
        },
        flash: { selector: { select: { options: ["short"] } } },
        effect: { selector: { select: { options: ["rainbow"] } } },
      },
    },
  },
  switch: {
    turn_on: { target: { entity: [{ domain: "switch" }] }, fields: {} },
  },
  script: {
    first: { fields: {}, response: { optional: true } },
    second: { fields: {}, response: { optional: true } },
  },
  test: {
    before: {
      fields: {
        early: { selector: { text: null } },
        late: { selector: { text: null } },
        tenths: { selector: { number: { min: 0, step: 0.1 } } },
        whole: { selector: { number: { min: 0, step: 0.1 } } },
        as_string: { selector: { text: null } },
        as_seconds: { selector: { number: { min: 0 } } },
        signed: { selector: { duration: { mode: "signed" } } },
        light: { selector: { text: null } },
        switch: { selector: { text: null } },
      },
    },
    after: {
      fields: {
        early: { selector: { time: {} } },
        late: { selector: { time: {} } },
        tenths: { selector: { number: { min: 0, step: 1 } } },
        whole: { selector: { number: { min: 0, step: 1 } } },
        as_string: { selector: { duration: { enable_day: true } } },
        as_seconds: { selector: { duration: { enable_day: true } } },
        signed: { selector: { duration: { mode: "offset" } } },
        light: {
          selector: {
            entity: {
              include_entities: ["light.kitchen", "switch.kettle"],
              filter: { domain: "switch" },
            },
          },
        },
        switch: {
          selector: {
            entity: {
              include_entities: ["light.kitchen", "switch.kettle"],
              filter: { domain: "switch" },
            },
          },
        },
      },
    },
  },
} as unknown as HassServices;

const hass = {
  ...createMockHass(
    {
      "light.kitchen": createMockEntityState("light.kitchen", "on"),
      "light.garage": createMockEntityState("light.garage", "on"),
      "switch.kettle": createMockEntityState("switch.kettle", "off"),
    },
    {
      entities: {
        "light.kitchen": { entity_id: "light.kitchen", area_id: "kitchen" },
        "light.garage": { entity_id: "light.garage", area_id: "garage" },
        "switch.kettle": { entity_id: "switch.kettle", area_id: "kitchen" },
      } as unknown as HomeAssistant["entities"],
    }
  ),
  services,
} as HomeAssistant;

describe("portAction", () => {
  it("keeps the target and fitting data when swapping between services", () => {
    const result = portAction(
      deepFreeze({
        action: "light.turn_on",
        alias: "Turn on the kitchen light",
        note: "Only in the evening",
        enabled: false,
        continue_on_error: true,
        metadata: {},
        target: { entity_id: "light.kitchen" },
        data: { transition: 5, brightness_pct: 50 },
      }),
      deepFreeze({ action: "light.turn_off", metadata: {} }),
      hass
    );

    expect(result).toEqual({
      action: "light.turn_off",
      metadata: {},
      note: "Only in the evening",
      enabled: false,
      continue_on_error: true,
      target: { entity_id: "light.kitchen" },
      data: { transition: 5 },
    });
  });

  it("checks values against fields that differ", () => {
    const result = portAction(
      {
        action: "light.turn_on",
        data: {
          transition: "{{ transition }}",
          brightness_pct: 50,
          flash: "short",
          effect: "{{ effect }}",
        },
      },
      { action: "light.toggle", metadata: {} },
      hass
    );

    expect(result).toMatchObject({
      data: { transition: "{{ transition }}", flash: "short" },
    });
  });

  it("checks values against what the new field accepts", () => {
    const result = portAction(
      {
        action: "test.before",
        data: {
          early: "07:30",
          late: "25:00",
          tenths: 1.5,
          whole: 2,
          as_string: "00:05:00",
          as_seconds: 300,
          signed: { minutes: -5 },
          light: "light.kitchen",
          switch: "switch.kettle",
        },
      },
      { action: "test.after", metadata: {} },
      hass
    );

    expect(result).toMatchObject({
      data: {
        early: "07:30",
        whole: 2,
        as_string: "00:05:00",
        as_seconds: 300,
        signed: { minutes: -5 },
        switch: "switch.kettle",
      },
    });
    expect(Object.keys((result as { data: object }).data)).toHaveLength(6);
  });

  it("reads targets stored in data", () => {
    const result = portAction(
      {
        action: "light.turn_on",
        data: { floor_id: "ground_floor", label_id: "evening" },
      },
      { action: "light.turn_off", metadata: {} },
      hass
    );

    expect(result).toMatchObject({
      target: { floor_id: "ground_floor", label_id: "evening" },
    });
  });

  it("only keeps targets that match a different target selector", () => {
    const result = portAction(
      {
        action: "light.turn_on",
        target: {
          entity_id: ["light.kitchen", "switch.kettle"],
          area_id: ["kitchen", "garage"],
        },
        data: { transition: 5 },
      },
      { action: "switch.turn_on", metadata: {} },
      hass
    );

    expect(result).toEqual({
      action: "switch.turn_on",
      metadata: {},
      target: { entity_id: ["switch.kettle"], area_id: ["kitchen"] },
      data: {},
    });
  });

  it("keeps a response variable only if the new service responds", () => {
    const old = { action: "script.first", response_variable: "result" };

    expect(
      portAction(old, { action: "script.second", metadata: {} }, hass)
    ).toMatchObject({ response_variable: "result" });
    expect(
      portAction(old, { action: "light.turn_off", metadata: {} }, hass)
    ).not.toHaveProperty("response_variable");
  });

  it("doesn't carry continue_on_error onto a condition", () => {
    const result = portAction(
      { action: "light.turn_on", continue_on_error: true, enabled: false },
      { condition: "state", entity_id: "", state: "" },
      hass
    );

    expect(result).toEqual({
      condition: "state",
      entity_id: "",
      state: "",
      enabled: false,
    });
  });
});

const behavior = {
  required: true,
  default: "each",
  selector: { automation_behavior: { mode: "trigger" } },
};

const triggerDescriptions = {
  "light.turned_on": {
    target: { entity: { domain: "light" } },
    fields: { behavior, for: { selector: { duration: {} } } },
  },
  "light.turned_off": {
    target: { entity: { domain: "light" } },
    fields: {
      behavior,
      for: { selector: { duration: {} } },
      ignore_unavailable: { required: true, selector: { boolean: {} } },
    },
  },
} as TriggerDescriptions;

describe("portTrigger", () => {
  it("keeps the target and options and fills the defaults", () => {
    const result = portTrigger(
      deepFreeze({
        trigger: "light.turned_on",
        id: "lights",
        alias: "Light turned on",
        target: { entity_id: "light.kitchen" },
        options: { behavior: "first", for: { minutes: 1 } },
      }),
      deepFreeze({ trigger: "light.turned_off" }),
      hass,
      triggerDescriptions
    );

    expect(result).toEqual({
      trigger: "light.turned_off",
      id: "lights",
      target: { entity_id: "light.kitchen" },
      options: {
        behavior: "first",
        for: { minutes: 1 },
        ignore_unavailable: false,
      },
    });
  });

  it("reads options stored at the top level", () => {
    const result = portTrigger(
      { trigger: "light.turned_on", for: { minutes: 2 } } as never,
      { trigger: "light.turned_off" },
      hass,
      triggerDescriptions
    );

    expect(result).toMatchObject({ options: { for: { minutes: 2 } } });
  });

  it("only keeps the row settings of built-in triggers", () => {
    const result = portTrigger(
      {
        trigger: "state",
        id: "door",
        alias: "Door opened",
        note: "Front door",
        enabled: false,
        variables: { room: "hall" },
        entity_id: ["light.kitchen"],
        to: "on",
      },
      { trigger: "light.turned_off" },
      hass,
      triggerDescriptions
    );

    // Without a target, the behavior default is left for the editor.
    expect(result).toEqual({
      trigger: "light.turned_off",
      id: "door",
      note: "Front door",
      enabled: false,
      variables: { room: "hall" },
      options: { ignore_unavailable: false },
    });
  });
});
