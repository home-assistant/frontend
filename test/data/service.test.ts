import type { HassService } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import {
  getServiceCallEntityIds,
  getServiceFieldDefaults,
  getServiceFieldVisibility,
  getServiceHiddenFields,
} from "../../src/data/service";

describe("getServiceCallEntityIds", () => {
  it("returns an empty list when no entities are targeted", () => {
    expect(getServiceCallEntityIds()).toEqual([]);
    expect(getServiceCallEntityIds({ brightness: 50 }, {})).toEqual([]);
    expect(getServiceCallEntityIds({}, { area_id: "kitchen" })).toEqual([]);
  });

  it("reads a single entity from target or service data", () => {
    expect(getServiceCallEntityIds({}, { entity_id: "light.a" })).toEqual([
      "light.a",
    ]);
    expect(getServiceCallEntityIds({ entity_id: "light.a" })).toEqual([
      "light.a",
    ]);
  });

  it("prefers the target over the legacy service data entity ids", () => {
    expect(
      getServiceCallEntityIds(
        { entity_id: ["light.a", "light.b"] },
        { entity_id: ["light.b", "light.c"] }
      )
    ).toEqual(["light.b", "light.c"]);
  });

  it("deduplicates entity ids", () => {
    expect(
      getServiceCallEntityIds({}, { entity_id: ["light.a", "light.a"] })
    ).toEqual(["light.a"]);
  });

  it("splits comma separated ids and lowercases them like Core does", () => {
    expect(
      getServiceCallEntityIds({}, { entity_id: "Light.A, light.b ,light.a" })
    ).toEqual(["light.a", "light.b"]);
  });

  it("ignores wildcard, malformed, and non-string entity ids", () => {
    expect(getServiceCallEntityIds({ entity_id: "all" })).toEqual([]);
    expect(
      getServiceCallEntityIds(
        {},
        { entity_id: ["all", "none", "", "light", 5] as unknown as string[] }
      )
    ).toEqual([]);
  });
});

const asFields = (fields: Record<string, unknown>) =>
  fields as unknown as HassService["fields"];

describe("getServiceFieldVisibility", () => {
  it("keeps the condition of a top level field", () => {
    expect(
      getServiceFieldVisibility(
        asFields({
          a: { selector: { boolean: {} } },
          b: { selector: { text: {} }, visible: { field: "a", value: true } },
        })
      )
    ).toEqual([
      ["a", undefined],
      ["b", { field: "a", value: true }],
    ]);
  });

  it("flattens the fields of a section", () => {
    expect(
      getServiceFieldVisibility(
        asFields({
          section: {
            fields: {
              a: { selector: { boolean: {} } },
              b: { selector: { text: {} } },
            },
          },
        })
      )
    ).toEqual([
      ["a", []],
      ["b", []],
    ]);
  });

  it("gives the fields of a section the condition of the section", () => {
    expect(
      getServiceFieldVisibility(
        asFields({
          a: { selector: { boolean: {} } },
          section: {
            visible: { field: "a", value: true },
            fields: {
              b: { selector: { text: {} } },
              c: {
                selector: { text: {} },
                visible: { field: "b", operator: "exists" },
              },
            },
          },
        })
      )
    ).toEqual([
      ["a", undefined],
      ["b", [{ field: "a", value: true }]],
      [
        "c",
        [
          { field: "a", value: true },
          { field: "b", operator: "exists" },
        ],
      ],
    ]);
  });

  it("hides every field of a section that is never visible", () => {
    expect(
      getServiceFieldVisibility(
        asFields({
          section: {
            visible: false,
            fields: { a: { selector: { text: {} } } },
          },
        })
      )
    ).toEqual([["a", false]]);
  });
});

describe("getServiceHiddenFields", () => {
  const modeFields = {
    mode: {
      required: true,
      default: "duration",
      selector: { select: { options: ["duration", "end_of_track"] } },
    },
    advanced: {
      fields: {
        duration: {
          required: true,
          selector: { duration: {} },
          visible: { field: "mode", value: "duration" },
        },
      },
    },
  } as unknown as HassService["fields"];
  const visibility = getServiceFieldVisibility(modeFields);
  const defaults = getServiceFieldDefaults(modeFields);

  it("collects the defaults of fields, including fields in sections", () => {
    expect(defaults).toEqual({ mode: "duration" });
  });

  it("evaluates a field without a value with its default", () => {
    expect(getServiceHiddenFields(visibility, defaults, {})).toEqual(new Set());
    expect(
      getServiceHiddenFields(visibility, defaults, { mode: undefined })
    ).toEqual(new Set());
  });

  it("never hides a field based on a template", () => {
    expect(
      getServiceHiddenFields(visibility, defaults, {
        mode: "{{ states('input_select.mode') }}",
      })
    ).toEqual(new Set());
  });

  it("uses the value of the field when it has one", () => {
    expect(
      getServiceHiddenFields(visibility, defaults, { mode: "end_of_track" })
    ).toEqual(new Set(["duration"]));
  });
});
