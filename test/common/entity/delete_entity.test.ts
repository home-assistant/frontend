import { describe, it, expect, vi } from "vitest";
import {
  isDeletableEntity,
  deleteEntity,
} from "../../../src/common/entity/delete_entity";
import type { HomeAssistant } from "../../../src/types";
import type { EntityRegistryEntry } from "../../../src/data/entity_registry";
import type { IntegrationManifest } from "../../../src/data/integration";
import type { ConfigEntry } from "../../../src/data/config_entries";
import type { Helper } from "../../../src/panels/config/helpers/const";

describe("isDeletableEntity", () => {
  it("should return true for restored entities", () => {
    const hass = {
      states: { "light.test": { attributes: { restored: true } } },
    } as unknown as HomeAssistant;
    const result = isDeletableEntity(hass, "light.test", [], [], [], []);
    expect(result).toBe(true);
  });

  it("should return false for non-restored entities without config entry", () => {
    const hass = {
      states: { "light.test": { attributes: {} } },
    } as unknown as HomeAssistant;
    const entityRegistry = [
      { entity_id: "light.test" },
    ] as EntityRegistryEntry[];
    const result = isDeletableEntity(
      hass,
      "light.test",
      [],
      entityRegistry,
      [],
      []
    );
    expect(result).toBe(false);
  });

  it("should return true for helper domain entities", () => {
    const hass = {
      states: { "input_boolean.test": { attributes: {} } },
      config: { components: ["input_boolean"] },
    } as unknown as HomeAssistant;
    const entityRegistry = [
      { entity_id: "input_boolean.test", unique_id: "123" },
    ] as EntityRegistryEntry[];
    const fetchedHelpers = [{ id: "123" }] as Helper[];
    const result = isDeletableEntity(
      hass,
      "input_boolean.test",
      [],
      entityRegistry,
      [],
      fetchedHelpers
    );
    expect(result).toBe(true);
  });

  it("should return false for non-helper domain entities without restored attribute", () => {
    const hass = {
      states: { "light.test": { attributes: {} } },
    } as unknown as HomeAssistant;
    const entityRegistry = [
      { entity_id: "light.test" },
    ] as EntityRegistryEntry[];
    const result = isDeletableEntity(
      hass,
      "light.test",
      [],
      entityRegistry,
      [],
      []
    );
    expect(result).toBe(false);
  });

  it("should return true for entities with helper integration type", () => {
    const hass = {
      states: { "light.test": { attributes: {} } },
    } as unknown as HomeAssistant;
    const entityRegistry = [
      { entity_id: "light.test", config_entry_id: "config_1" },
    ] as EntityRegistryEntry[];
    const configEntries = [
      { entry_id: "config_1", domain: "light" },
    ] as ConfigEntry[];
    const manifests = [
      { domain: "light", integration_type: "helper" },
    ] as IntegrationManifest[];
    const result = isDeletableEntity(
      hass,
      "light.test",
      manifests,
      entityRegistry,
      configEntries,
      []
    );
    expect(result).toBe(true);
  });
});

describe("deleteEntity", () => {
  it("should call removeEntityRegistryEntry for restored entities", () => {
    const removeEntityRegistryEntry = vi.fn();
    const hass = {
      states: { "light.test": { attributes: { restored: true } } },
      callWS: removeEntityRegistryEntry,
    } as unknown as HomeAssistant;
    const entityRegistry = [
      { entity_id: "light.test" },
    ] as EntityRegistryEntry[];
    deleteEntity(hass, "light.test", [], entityRegistry, [], []);
    expect(removeEntityRegistryEntry).toHaveBeenCalledWith({
      type: "config/entity_registry/remove",
      entity_id: "light.test",
    });
  });

  it("should call deleteConfigEntry for entities with helper integration type", () => {
    const deleteConfigEntry = vi.fn();
    const hass = {
      states: { "light.test": { attributes: {} } },
      callApi: deleteConfigEntry,
    } as unknown as HomeAssistant;
    const entityRegistry = [
      { entity_id: "light.test", config_entry_id: "config_1" },
    ] as EntityRegistryEntry[];
    const configEntries = [
      { entry_id: "config_1", domain: "light" },
    ] as ConfigEntry[];
    const manifests = [
      { domain: "light", integration_type: "helper" },
    ] as IntegrationManifest[];
    deleteEntity(
      hass,
      "light.test",
      manifests,
      entityRegistry,
      configEntries,
      []
    );
    expect(deleteConfigEntry).toHaveBeenCalledOnce();
  });

  it("should call HELPERS_CRUD.delete for helper domain entities", () => {
    const deleteCall = vi.fn();
    const hass = {
      states: { "input_boolean.test": { attributes: {} } },
      config: { components: ["input_boolean"] },
      callWS: deleteCall,
    } as unknown as HomeAssistant;
    const entityRegistry = [
      { entity_id: "input_boolean.test", unique_id: "123" },
    ] as EntityRegistryEntry[];
    const fetchedHelpers = [{ id: "123" }] as Helper[];
    deleteEntity(
      hass,
      "input_boolean.test",
      [],
      entityRegistry,
      [],
      fetchedHelpers
    );
    expect(deleteCall).toHaveBeenCalledWith({
      type: "input_boolean/delete",
      input_boolean_id: "123",
    });
  });

  it("should call removeEntityRegistryEntry for helper domain entities", () => {
    const removeEntityRegistryEntry = vi.fn();
    const hass = {
      states: { "input_boolean.test": { attributes: { restored: true } } },
      config: { components: ["input_boolean"] },
      callWS: removeEntityRegistryEntry,
    } as unknown as HomeAssistant;
    const entityRegistry = [
      { entity_id: "input_boolean.test", unique_id: "124" },
    ] as EntityRegistryEntry[];
    const fetchedHelpers = [{ id: "123" }] as Helper[];
    deleteEntity(
      hass,
      "input_boolean.test",
      [],
      entityRegistry,
      [],
      fetchedHelpers
    );
    expect(removeEntityRegistryEntry).toHaveBeenCalledWith({
      type: "config/entity_registry/remove",
      entity_id: "input_boolean.test",
    });
  });
});
