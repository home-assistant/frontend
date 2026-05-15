import { describe, expect, it } from "vitest";
import { clearEntityReferences } from "../../../../../src/panels/config/lovelace/dashboards/import-utils";

describe("clearEntityReferences", () => {
  it("returns primitives unchanged", () => {
    expect(clearEntityReferences(42)).toBe(42);
    expect(clearEntityReferences("hello")).toBe("hello");
    expect(clearEntityReferences(null)).toBe(null);
    expect(clearEntityReferences(undefined)).toBe(undefined);
  });

  it("clears a top-level entity string", () => {
    expect(clearEntityReferences({ entity: "light.living_room" })).toEqual({
      entity: "",
    });
  });

  it("clears a top-level entities array", () => {
    expect(clearEntityReferences({ entities: ["light.a", "light.b"] })).toEqual(
      { entities: [] }
    );
  });

  it("recursively clears entity references in nested objects", () => {
    const input = {
      type: "entities",
      card: {
        entity: "sensor.temperature",
        name: "Temperature",
      },
    };
    expect(clearEntityReferences(input)).toEqual({
      type: "entities",
      card: {
        entity: "",
        name: "Temperature",
      },
    });
  });

  it("recursively clears entity references in arrays", () => {
    const input = [
      { entity: "light.a", name: "Light A" },
      { entity: "light.b", name: "Light B" },
    ];
    expect(clearEntityReferences(input)).toEqual([
      { entity: "", name: "Light A" },
      { entity: "", name: "Light B" },
    ]);
  });

  it("clears deeply nested entity and entities fields", () => {
    const input = {
      views: [
        {
          cards: [
            {
              type: "glance",
              entities: ["light.a", "light.b"],
            },
            {
              type: "entity",
              entity: "sensor.power",
            },
          ],
        },
      ],
    };
    expect(clearEntityReferences(input)).toEqual({
      views: [
        {
          cards: [
            {
              type: "glance",
              entities: [],
            },
            {
              type: "entity",
              entity: "",
            },
          ],
        },
      ],
    });
  });

  it("leaves unrelated fields unchanged", () => {
    const input = { type: "button", name: "My button", icon: "mdi:lightbulb" };
    expect(clearEntityReferences(input)).toEqual(input);
  });
});
