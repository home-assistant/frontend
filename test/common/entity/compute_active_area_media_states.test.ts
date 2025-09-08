import { describe, expect, it } from "vitest";
import type { HassEntityBase } from "home-assistant-js-websocket";
import { computeActiveAreaMediaStates } from "../../../src/data/media-player";

describe("computeActiveAreaMediaStates", () => {
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
        } as HassEntityBase,
        "media_player.speaker": {
          entity_id: "media_player.speaker",
          state: "idle",
        } as HassEntityBase,
      },
    } as any;

    const result = computeActiveAreaMediaStates(hass, "living_room");

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
        } as HassEntityBase,
      },
    } as any;

    const result = computeActiveAreaMediaStates(hass, "living_room");

    expect(result).toHaveLength(1);
    expect(result[0].state).toBe("paused");
  });

  it("returns empty array when no area is configured", () => {
    const hass = {
      areas: {},
      entities: {},
      states: {},
    } as any;

    const result = computeActiveAreaMediaStates(hass, "living_room");

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
        } as HassEntityBase,
      },
    } as any;

    const result = computeActiveAreaMediaStates(hass, "living_room");

    expect(result).toHaveLength(0);
  });

  it("returns both playing and paused media entities in the area", () => {
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
        } as HassEntityBase,
        "media_player.speaker": {
          entity_id: "media_player.speaker",
          state: "paused",
        } as HassEntityBase,
      },
    } as any;

    const result = computeActiveAreaMediaStates(hass, "living_room");

    expect(result).toHaveLength(2);
    expect(result.map((entity) => entity.entity_id)).toContain(
      "media_player.tv"
    );
    expect(result.map((entity) => entity.entity_id)).toContain(
      "media_player.speaker"
    );
  });
});
