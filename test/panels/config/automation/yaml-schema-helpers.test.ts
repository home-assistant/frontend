import { describe, expect, test } from "vitest";

import type { HaFormSchema } from "../../../../src/components/ha-form/types";
import type { Action } from "../../../../src/data/script";
import type { HomeAssistant } from "../../../../src/types";
import {
  actionSchemaKey,
  actionToYamlSchema,
  builtInActionSchema,
  builtInConditionSchema,
  builtInTriggerSchema,
  haFormSchemaToYamlFieldSchemaMap,
  serviceActionSchema,
} from "../../../../src/panels/config/automation/yaml_schema_helpers";
import type { YamlFieldSchemaMap } from "../../../../src/resources/yaml_field_schema";
import { hasAllowUnknownFields } from "../../../../src/resources/yaml_field_schema";
import en from "../../../../src/translations/en.json";

const localize = ((key: string) => key) as HomeAssistant["localize"];

const BUILT_IN_ACTION_TYPES = [
  "delay",
  "wait_template",
  "wait_for_trigger",
  "event",
  "condition",
  "stop",
  "repeat",
  "choose",
  "if",
  "sequence",
  "parallel",
  "variables",
  "set_conversation_response",
];

const BUILT_IN_TRIGGER_TYPES = [
  "state",
  "numeric_state",
  "event",
  "homeassistant",
  "template",
  "time",
  "time_pattern",
  "sun",
  "zone",
  "tag",
  "webhook",
  "geo_location",
  "calendar",
  "persistent_notification",
  "conversation",
  "device",
];

const BUILT_IN_CONDITION_TYPES = [
  "state",
  "numeric_state",
  "template",
  "time",
  "sun",
  "zone",
  "trigger",
  "and",
  "or",
  "not",
  "device",
];

describe("haFormSchemaToYamlFieldSchemaMap", () => {
  test("maps selector entries straight through", () => {
    const schema = [
      { name: "entity_id", required: true, selector: { entity: {} } },
    ] as const satisfies readonly HaFormSchema[];

    expect(haFormSchemaToYamlFieldSchemaMap(schema)).toEqual({
      entity_id: {
        required: true,
        default: undefined,
        description: undefined,
        selector: { entity: {} },
      },
    });
  });

  test("converts select entries into a select selector", () => {
    const schema = [
      {
        name: "behavior",
        type: "select",
        options: [
          ["first", "First"],
          ["all", "All"],
        ],
      },
    ] as const satisfies readonly HaFormSchema[];

    expect(haFormSchemaToYamlFieldSchemaMap(schema).behavior.selector).toEqual({
      select: {
        options: [
          { value: "first", label: "First" },
          { value: "all", label: "All" },
        ],
      },
    });
  });

  test("flattens grid and expandable containers into the parent map", () => {
    const schema = [
      {
        name: "grid",
        type: "grid",
        schema: [{ name: "above", selector: { number: {} } }],
      },
      {
        name: "advanced",
        type: "expandable",
        schema: [{ name: "for", selector: { duration: {} } }],
      },
    ] as const satisfies readonly HaFormSchema[];

    expect(Object.keys(haFormSchemaToYamlFieldSchemaMap(schema))).toEqual([
      "above",
      "for",
    ]);
  });

  test("uses the description callback when given", () => {
    const schema = [
      { name: "entity_id", selector: { entity: {} } },
    ] as const satisfies readonly HaFormSchema[];

    expect(
      haFormSchemaToYamlFieldSchemaMap(schema, (field) => `desc:${field}`)
        .entity_id.description
    ).toBe("desc:entity_id");
  });

  test("skips entries without a name and unsupported types", () => {
    const schema = [
      { type: "constant", name: "info", value: "x" },
    ] as const satisfies readonly HaFormSchema[];

    expect(haFormSchemaToYamlFieldSchemaMap(schema)).toEqual({});
  });
});

describe("actionSchemaKey", () => {
  test("returns the service name for service calls", () => {
    expect(
      actionSchemaKey({ action: "light.turn_on" } as unknown as Action)
    ).toBe("light.turn_on");
  });

  test("returns the built-in key for built-in actions", () => {
    expect(actionSchemaKey({ delay: "00:00:05" } as unknown as Action)).toBe(
      "delay"
    );
    expect(
      actionSchemaKey({ choose: [], default: [] } as unknown as Action)
    ).toBe("choose");
  });

  test("is stable while the action's values change", () => {
    expect(
      actionSchemaKey({
        action: "light.turn_on",
        target: { entity_id: "light.kitchen" },
      } as unknown as Action)
    ).toBe(
      actionSchemaKey({
        action: "light.turn_on",
        target: { entity_id: "light.bedroom" },
        data: { brightness: 5 },
      } as unknown as Action)
    );
  });

  test("returns undefined for an unrecognized action", () => {
    expect(actionSchemaKey({ unknown_thing: 1 } as unknown as Action)).toBe(
      undefined
    );
  });
});

describe("actionToYamlSchema", () => {
  const services = {
    light: {
      turn_on: {
        name: "Turn on",
        description: "",
        fields: {
          brightness: {
            selector: { number: { min: 0, max: 255 } },
            description: "Brightness",
          },
        },
        target: { entity: [{ domain: ["light"] }] },
      },
    },
  } as unknown as HomeAssistant["services"];

  test("builds a service schema for service calls", () => {
    const schema = actionToYamlSchema("light.turn_on", services, localize)!;

    expect(schema.action.required).toBe(true);
    expect(schema.data.fields?.brightness.selector).toEqual({
      number: { min: 0, max: 255 },
    });
    // The service's target filter is forwarded into the entity_id selector.
    expect(schema.target.fields?.entity_id.selector).toEqual({
      entity: { multiple: true, filter: [{ domain: ["light"] }] },
    });
  });

  test("builds a built-in schema for built-in actions", () => {
    expect(actionToYamlSchema("delay", services, localize)).toBe(
      builtInActionSchema("delay")
    );
  });

  test("falls back to base fields that allow unknown keys", () => {
    const schema = actionToYamlSchema(undefined, services, localize)!;

    expect(Object.keys(schema)).toEqual([
      "alias",
      "enabled",
      "continue_on_error",
    ]);
    expect(hasAllowUnknownFields(schema)).toBe(true);
  });

  test("does not leak the allow-unknown marker into other schemas", () => {
    actionToYamlSchema(undefined, services, localize);

    expect(hasAllowUnknownFields(builtInActionSchema("delay")!)).toBe(false);
  });
});

describe("serviceActionSchema", () => {
  test("hoists grouped advanced fields to the top level of data", () => {
    const services = {
      light: {
        turn_on: {
          name: "Turn on",
          description: "",
          fields: {
            brightness: { selector: { number: {} } },
            advanced_fields: {
              collapsed: true,
              fields: { transition: { selector: { number: {} } } },
            },
          },
        },
      },
    } as unknown as HomeAssistant["services"];

    const schema = serviceActionSchema("light", "turn_on", services, localize);

    expect(Object.keys(schema.data.fields!)).toEqual([
      "brightness",
      "transition",
    ]);
  });

  test("does not mark a field required when it has a default", () => {
    const services = {
      light: {
        turn_on: {
          name: "Turn on",
          description: "",
          fields: {
            brightness: { required: true, default: 255, selector: {} },
            color_name: { required: true, selector: {} },
          },
        },
      },
    } as unknown as HomeAssistant["services"];

    const fields = serviceActionSchema("light", "turn_on", services, localize)
      .data.fields!;

    expect(fields.brightness.required).toBe(false);
    expect(fields.color_name.required).toBe(true);
  });
});

describe("builtInTriggerSchema / builtInConditionSchema", () => {
  test("always includes the shared base fields", () => {
    expect(Object.keys(builtInTriggerSchema("state", localize)!)).toEqual(
      expect.arrayContaining(["trigger", "id", "alias", "enabled", "variables"])
    );
    expect(Object.keys(builtInConditionSchema("state", localize)!)).toEqual(
      expect.arrayContaining(["condition", "alias", "enabled"])
    );
  });

  test("device triggers and conditions accept integration-specific keys", () => {
    expect(
      hasAllowUnknownFields(builtInTriggerSchema("device", localize)!)
    ).toBe(true);
    expect(
      hasAllowUnknownFields(builtInConditionSchema("device", localize)!)
    ).toBe(true);
  });

  test("known trigger types do not accept unknown keys", () => {
    expect(
      hasAllowUnknownFields(builtInTriggerSchema("state", localize)!)
    ).toBe(false);
  });
});

describe("built-in field descriptions", () => {
  // Built-in schemas carry translation keys as their description; the hover
  // tooltip and completion info resolve them through localize(). A key that
  // isn't in en.json would silently render as the raw key.
  const resolve = (key: string): unknown =>
    key
      .split(".")
      .reduce<any>((node, part) => (node ? node[part] : undefined), en);

  const collect = (map: YamlFieldSchemaMap | undefined, into: string[]) => {
    for (const field of Object.values(map ?? {})) {
      if (field.description) into.push(field.description);
      collect(field.fields, into);
    }
    return into;
  };

  const descriptionsOf = (map: YamlFieldSchemaMap | undefined) =>
    collect(map, []);

  test.each(BUILT_IN_ACTION_TYPES)("action %s", (type) => {
    const keys = descriptionsOf(builtInActionSchema(type));
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach((key) => expect(resolve(key), key).toBeTypeOf("string"));
  });

  test.each(BUILT_IN_TRIGGER_TYPES)("trigger %s", (type) => {
    const keys = descriptionsOf(builtInTriggerSchema(type, localize));
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach((key) => expect(resolve(key), key).toBeTypeOf("string"));
  });

  test.each(BUILT_IN_CONDITION_TYPES)("condition %s", (type) => {
    const keys = descriptionsOf(builtInConditionSchema(type, localize));
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach((key) => expect(resolve(key), key).toBeTypeOf("string"));
  });

  test("service action schema", () => {
    const keys = descriptionsOf(
      serviceActionSchema(
        "light",
        "turn_on",
        {} as HomeAssistant["services"],
        localize
      )
    );
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach((key) => expect(resolve(key), key).toBeTypeOf("string"));
  });
});
