import { describe, expect, it } from "vitest";
import { targetExists } from "../../../../src/panels/config/automation/target/target_exists";
import type { HomeAssistantRegistries } from "../../../../src/types";

describe("targetExists", () => {
  it("works", () => {
    const registries = {
      entities: { "light.kitchen": {} },
      devices: { enabled: {}, disabled: { disabled_by: "user" } },
      areas: { kitchen: {} },
      floors: {},
    } as unknown as HomeAssistantRegistries;
    const states = {
      "light.kitchen": {},
      "light.yaml": {},
    } as unknown as Parameters<typeof targetExists>[1];

    expect(
      targetExists(registries, states, [], "entity", "light.kitchen")
    ).toBe(true);
    expect(targetExists(registries, states, [], "area", "kitchen")).toBe(true);
    expect(targetExists(registries, states, [], "device", "enabled")).toBe(
      true
    );
    expect(targetExists(registries, states, [], "device", "disabled")).toBe(
      false
    );
    // Entities without a registry entry are not part of the target tree
    expect(targetExists(registries, states, [], "entity", "light.yaml")).toBe(
      false
    );
    // Inherited object properties don't count as targets
    expect(targetExists(registries, states, [], "entity", "toString")).toBe(
      false
    );
    expect(targetExists(registries, states, [], "area", "constructor")).toBe(
      false
    );
  });
});
