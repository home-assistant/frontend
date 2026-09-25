import { describe, expect, it } from "vitest";

import { MockMediaPlayerEntity } from "../../../src/fake_data/entities/media-player-entity";

describe("MockMediaPlayerEntity", () => {
  it("exposes capability and state attributes for active states", () => {
    const entity = new MockMediaPlayerEntity({
      entity_id: "media_player.demo",
      state: "playing",
      attributes: {
        friendly_name: "Demo player",
        supported_features: 64063,
        source_list: ["TV", "Chromecast"],
        sound_mode_list: ["Movie", "Music"],
        media_content_type: "music",
        media_title: "Song",
        media_artist: "Artist",
        media_album_name: "Album",
        media_series_title: "Series",
        media_duration: 300,
        media_position: 45,
        media_position_updated_at: "2026-03-12T18:00:00Z",
        app_name: "Spotify",
        volume_level: 0.45,
        is_volume_muted: false,
        sound_mode: "Movie",
        source: "TV",
        group_members: ["media_player.kitchen"],
      },
    });

    const state = entity.toState();

    expect(state.attributes.source_list).toEqual(["TV", "Chromecast"]);
    expect(state.attributes.sound_mode_list).toEqual(["Movie", "Music"]);
    expect(state.attributes.media_duration).toBe(300);
    expect(state.attributes.media_position).toBe(45);
    expect(state.attributes.volume_level).toBe(0.45);
    expect(state.attributes.source).toBe("TV");
  });

  it("keeps capability attributes while nulling state attributes when off", () => {
    const entity = new MockMediaPlayerEntity({
      entity_id: "media_player.demo",
      state: "off",
      attributes: {
        friendly_name: "Demo player",
        supported_features: 64063,
        source_list: ["TV", "Chromecast"],
        sound_mode_list: ["Movie", "Music"],
        media_duration: 300,
        media_position: 45,
        volume_level: 0.45,
        is_volume_muted: false,
        source: "TV",
      },
    });

    const state = entity.toState();

    expect(state.attributes.source_list).toEqual(["TV", "Chromecast"]);
    expect(state.attributes.sound_mode_list).toEqual(["Movie", "Music"]);
    expect(state.attributes.media_duration).toBeNull();
    expect(state.attributes.media_position).toBeNull();
    expect(state.attributes.volume_level).toBeNull();
    expect(state.attributes.is_volume_muted).toBeNull();
    expect(state.attributes.source).toBeNull();
  });
});
