import { describe, expect, it } from "vitest";
import type { HassEntity } from "home-assistant-js-websocket";
import { computeActiveMediaStates } from "../../../src/common/entity/compute_active_media_states";

describe("computeActiveMediaStates", () => {
  it("returns playing media entities in the area", () => {
    const hass = {
      areas: { living_room: { area_id: "living_room" } },
      entities: {
        "media_player.tv": {
          entity_id: "media_player.tv",
          area_id: "living_room",
        },
        "media_player.speaker": {
          entity_id: "media_player.speaker",
          area_id: "living_room",
        },
      },
      states: {
        "media_player.tv": {
          entity_id: "media_player.tv",
          state: "playing",
        } as HassEntity,
        "media_player.speaker": {
          entity_id: "media_player.speaker",
          state: "idle",
        } as HassEntity,
      },
    } as any;

    const result = computeActiveMediaStates(hass, "living_room");

    expect(result).toHaveLength(1);
    expect(result[0].entity_id).toBe("media_player.tv");
    expect(result[0].state).toBe("playing");
  });

  it("returns paused media entities in the area", () => {
    const hass = {
      areas: { living_room: { area_id: "living_room" } },
      entities: {
        "media_player.tv": {
          entity_id: "media_player.tv",
          area_id: "living_room",
        },
      },
      states: {
        "media_player.tv": {
          entity_id: "media_player.tv",
          state: "paused",
        } as HassEntity,
      },
    } as any;

    const result = computeActiveMediaStates(hass, "living_room");

    expect(result).toHaveLength(1);
    expect(result[0].state).toBe("paused");
  });

  it("returns empty array when no area is configured", () => {
    const hass = {
      areas: {},
      entities: {},
      states: {},
    } as any;

    const result = computeActiveMediaStates(hass);

    expect(result).toHaveLength(0);
  });

  it("returns empty array when area does not exist", () => {
    const hass = {
      areas: {},
      entities: {},
      states: {},
    } as any;

    const result = computeActiveMediaStates(hass, "nonexistent_area");

    expect(result).toHaveLength(0);
  });

  it("returns empty array when media player is not assigned to area", () => {
    const hass = {
      areas: { living_room: { area_id: "living_room" } },
      entities: {
        "media_player.bedroom": { entity_id: "media_player.bedroom" },
      },
      states: {
        "media_player.bedroom": {
          entity_id: "media_player.bedroom",
          state: "playing",
        } as HassEntity,
      },
    } as any;

    const result = computeActiveMediaStates(hass, "living_room");

    expect(result).toHaveLength(0);
  });
});
