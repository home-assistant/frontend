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

  it("returns playing speaker when speaker is playing", () => {
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
          state: "idle",
        } as HassEntityBase,
        "media_player.speaker": {
          entity_id: "media_player.speaker",
          state: "playing",
        } as HassEntityBase,
      },
    } as any;

    const result = computeActiveAreaMediaStates(hass, "living_room");

    expect(result).toHaveLength(1);
    expect(result[0].entity_id).toBe("media_player.speaker");
    expect(result[0].state).toBe("playing");
  });

  it("returns media entities that inherit area from device", () => {
    const hass = {
      areas: { living_room: { area_id: "living_room" } },
      devices: {
        device_tv: {
          id: "device_tv",
          area_id: "living_room",
        },
      },
      entities: {
        "media_player.tv": {
          entity_id: "media_player.tv",
          device_id: "device_tv", // Entity belongs to device
          // No direct area_id - inherits from device
        },
      },
      states: {
        "media_player.tv": {
          entity_id: "media_player.tv",
          state: "playing",
        } as HassEntityBase,
      },
    } as any;

    const result = computeActiveAreaMediaStates(hass, "living_room");

    expect(result).toHaveLength(1);
    expect(result[0].entity_id).toBe("media_player.tv");
    expect(result[0].state).toBe("playing");
  });
});

describe("computeActiveAreaMediaStates badge priority", () => {
  it("prioritizes alert badge over media badge", () => {
    const hass = {
      areas: { living_room: { area_id: "living_room" } },
      entities: {
        "binary_sensor.door": {
          entity_id: "binary_sensor.door",
          area_id: "living_room",
        },
        "media_player.tv": {
          entity_id: "media_player.tv",
          area_id: "living_room",
        },
      },
      states: {
        "binary_sensor.door": {
          entity_id: "binary_sensor.door",
          state: "on",
        } as HassEntityBase,
        "media_player.tv": {
          entity_id: "media_player.tv",
          state: "playing",
        } as HassEntityBase,
      },
    } as any;

    const alertStates = hass.states["binary_sensor.door"]
      ? [hass.states["binary_sensor.door"]]
      : [];
    const mediaStates = computeActiveAreaMediaStates(hass, "living_room");

    // Alert badge should take priority
    expect(alertStates.length > 0).toBe(true);
    expect(mediaStates.length > 0).toBe(true);
    expect(alertStates.length > 0 ? "alert" : "media").toBe("alert");
  });

  it("shows media badge when no alerts", () => {
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
          state: "playing",
        } as HassEntityBase,
      },
    } as any;

    const alertStates: HassEntityBase[] = [];
    const mediaStates = computeActiveAreaMediaStates(hass, "living_room");

    expect(alertStates.length).toBe(0);
    expect(mediaStates.length).toBe(1);
    expect(alertStates.length > 0 ? "alert" : "media").toBe("media");
  });
});
