import { getEntity } from "../../../src/fake_data/entity";

export const createMediaPlayerEntities = () => [
  getEntity("media_player", "bedroom", "playing", {
    media_content_type: "movie",
    media_title: "Epic sax guy 10 hours",
    app_name: "YouTube",
    friendly_name: "Skip, no pause",
    supported_features: 32,
  }),
  getEntity("media_player", "family_room", "paused", {
    friendly_name: "Paused, music",
    media_content_type: "music",
    media_title: "I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)",
    media_artist: "Technohead",
    supported_features: 16417,
    entity_picture: "/images/album_cover.jpg",
  }),
  getEntity("media_player", "family_room_no_play", "paused", {
    friendly_name: "Paused, no play",
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
  getEntity("media_player", "lounge_room", "idle", {
    friendly_name: "Screen casting",
    media_content_type: "music",
    media_title: "I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)",
    media_artist: "Technohead",
    supported_features: 1,
  }),
  getEntity("media_player", "theater", "off", {
    friendly_name: "Chromcast Idle",
    media_content_type: "movie",
    media_title: "Epic sax guy 10 hours",
    app_name: "YouTube",
    supported_features: 33,
  }),
  getEntity("media_player", "android_cast", "playing", {
    friendly_name: "Player Off",
    media_title: "Android Screen Casting",
    app_name: "Screen Mirroring",
    supported_features: 21437,
  }),
  getEntity("media_player", "unavailable", "unavailable", {
    friendly_name: "Player Unavailable",
    supported_features: 21437,
  }),
  getEntity("media_player", "unknown", "unknown", {
    friendly_name: "Player Unknown",
    supported_features: 21437,
  }),
];
