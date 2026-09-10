import { describe, it, expect, vi } from "vitest";
import type { ExposeEntitySettings } from "../../src/data/expose";
import {
  exposeEntities,
  exposeUnlockedEntities,
  getEntityVoiceAssistantsIds,
  listExposedEntities,
} from "../../src/data/expose";
import type { EntityRegistryEntry } from "../../src/data/entity/entity_registry";
import type { HomeAssistant } from "../../src/types";

describe("exposeEntities", () => {
  it("calls the expose_entity websocket command", () => {
    const hass = { callWS: vi.fn() } as unknown as HomeAssistant;
    exposeEntities(hass, ["conversation"], ["light.kitchen"], true);
    expect(hass.callWS).toHaveBeenCalledWith({
      type: "homeassistant/expose_entity",
      assistants: ["conversation"],
      entity_ids: ["light.kitchen"],
      should_expose: true,
    });
  });
});

describe("listExposedEntities", () => {
  it("calls the expose_entity/list websocket command", () => {
    const hass = { callWS: vi.fn() } as unknown as HomeAssistant;
    listExposedEntities(hass);
    expect(hass.callWS).toHaveBeenCalledWith({
      type: "homeassistant/expose_entity/list",
    });
  });
});

describe("exposeUnlockedEntities", () => {
  it("submits every entity for every assistant when nothing is locked", async () => {
    const hass = {
      callWS: vi.fn().mockResolvedValue({}),
    } as unknown as HomeAssistant;
    await exposeUnlockedEntities(
      hass,
      ["conversation", "cloud.google_assistant"],
      ["light.kitchen", "light.bedroom"],
      undefined,
      true
    );
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(hass.callWS).toHaveBeenNthCalledWith(1, {
      type: "homeassistant/expose_entity",
      assistants: ["conversation"],
      entity_ids: ["light.kitchen", "light.bedroom"],
      should_expose: true,
    });
    expect(hass.callWS).toHaveBeenNthCalledWith(2, {
      type: "homeassistant/expose_entity",
      assistants: ["cloud.google_assistant"],
      entity_ids: ["light.kitchen", "light.bedroom"],
      should_expose: true,
    });
  });

  it("excludes a locked entity only from the assistant it is locked for", async () => {
    const hass = {
      callWS: vi.fn().mockResolvedValue({}),
    } as unknown as HomeAssistant;
    const lockedEntities: Record<string, ExposeEntitySettings> = {
      "light.kitchen": { google_assistant: true },
    };
    await exposeUnlockedEntities(
      hass,
      ["conversation", "google_assistant"],
      ["light.kitchen", "light.bedroom"],
      lockedEntities,
      false
    );
    expect(hass.callWS).toHaveBeenCalledTimes(2);
    expect(hass.callWS).toHaveBeenNthCalledWith(1, {
      type: "homeassistant/expose_entity",
      assistants: ["conversation"],
      entity_ids: ["light.kitchen", "light.bedroom"],
      should_expose: false,
    });
    expect(hass.callWS).toHaveBeenNthCalledWith(2, {
      type: "homeassistant/expose_entity",
      assistants: ["google_assistant"],
      entity_ids: ["light.bedroom"],
      should_expose: false,
    });
  });

  it("skips an assistant entirely when every entity is locked for it", async () => {
    const hass = {
      callWS: vi.fn().mockResolvedValue({}),
    } as unknown as HomeAssistant;
    const lockedEntities: Record<string, ExposeEntitySettings> = {
      "light.kitchen": { google_assistant: true },
    };
    await exposeUnlockedEntities(
      hass,
      ["google_assistant"],
      ["light.kitchen"],
      lockedEntities,
      true
    );
    expect(hass.callWS).not.toHaveBeenCalled();
  });
});

describe("getEntityVoiceAssistantsIds", () => {
  it("returns the assistants an entity is exposed to", () => {
    const entityRegistry = [
      {
        entity_id: "light.kitchen",
        options: {
          conversation: { should_expose: true },
          "cloud.google_assistant": { should_expose: false },
        },
      },
    ] as unknown as EntityRegistryEntry[];
    expect(
      getEntityVoiceAssistantsIds(entityRegistry, "light.kitchen")
    ).toEqual(["conversation"]);
  });

  it("returns an empty array for an entity with no exposure options", () => {
    const entityRegistry = [
      { entity_id: "light.kitchen", options: {} },
    ] as unknown as EntityRegistryEntry[];
    expect(
      getEntityVoiceAssistantsIds(entityRegistry, "light.kitchen")
    ).toEqual([]);
  });
});
