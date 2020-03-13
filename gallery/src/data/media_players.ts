import { getEntity } from "../../../src/fake_data/entity";

export const createMediaPlayerEntities = () => [
  getEntity("media_player", "music_paused", "paused", {
    friendly_name: "Pausing The Music",
    media_content_type: "music",
    media_title: "I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)",
    media_artist: "Technohead",
    supported_features: 64063,
    entity_picture: "/images/album_cover_2.jpg",
    media_duration: 300,
    media_position: 50,
    media_position_updated_at: new Date(
      // 23 seconds in
      new Date().getTime() - 23000
    ).toISOString(),
  }),
  getEntity("media_player", "music_playing", "playing", {
    friendly_name: "Playing The Music",
    media_content_type: "music",
    media_title: "I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)",
    media_artist: "Technohead",
    supported_features: 64063,
    entity_picture: "/images/album_cover.jpg",
    media_duration: 300,
    media_position: 0,
    media_position_updated_at: new Date(
      // 23 seconds in
      new Date().getTime() - 23000
    ).toISOString(),
  }),
  getEntity("media_player", "stream_playing", "playing", {
    friendly_name: "Playing the Stream",
    media_content_type: "movie",
    media_title: "Epic sax guy 10 hours",
    app_name: "YouTube",
    supported_features: 33,
  }),
  getEntity("media_player", "living_room", "playing", {
    friendly_name: "Pause, No skip, tvshow",
    media_content_type: "tvshow",
    media_title: "Chapter 1",
    media_series_title: "House of Cards",
    app_name: "Netflix",
    supported_features: 1,
  }),
  getEntity("media_player", "sonos_idle", "idle", {
    friendly_name: "Sonos Idle",
    supported_features: 64063,
  }),
  getEntity("media_player", "theater", "off", {
    friendly_name: "TV Off",
    supported_features: 161,
  }),
  getEntity("media_player", "android_cast", "playing", {
    friendly_name: "Casting App",
    media_title: "Android Screen Casting",
    app_name: "Screen Mirroring",
    // supported_features: 21437,
  }),
  getEntity("media_player", "unavailable", "unavailable", {
    friendly_name: "Player Unavailable",
    supported_features: 21437,
  }),
  getEntity("media_player", "unknown", "unknown", {
    friendly_name: "Player Unknown",
    supported_features: 21437,
  }),
  getEntity("media_player", "receiver_on", "on", {
    source_list: ["AirPlay", "Blu-Ray", "TV", "USB", "iPod (USB)"],
    volume_level: 0.63,
    is_volume_muted: false,
    source: "TV",
    friendly_name: "Receiver",
    supported_features: 84364,
  }),
  getEntity("media_player", "receiver_off", "off", {
    source_list: ["AirPlay", "Blu-Ray", "TV", "USB", "iPod (USB)"],
    friendly_name: "Receiver",
    supported_features: 84364,
  }),
];
