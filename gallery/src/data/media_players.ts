import { getEntity } from "../../../src/fake_data/entity";

export const createMediaPlayerEntities = () => [
  getEntity("media_player", "music_paused", "paused", {
    friendly_name: "Pausing The Music",
    media_content_type: "music",
    media_title: "I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)",
    media_artist: "Technohead",
    // Pause + Seek + Volume Set + Volume Mute + Previous Track + Next Track + Play Media +
    // Select Source + Stop + Clear + Play + Shuffle Set
    supported_features: 64063,
    entity_picture: "/images/album_cover_2.jpg",
    media_duration: 300,
    media_position: 50,
    media_position_updated_at: new Date(
      // 23 seconds in
      new Date().getTime() - 23000
    ).toISOString(),
    volume_level: 0.5,
  }),
  getEntity("media_player", "music_playing", "playing", {
    friendly_name: "Playing The Music",
    media_content_type: "music",
    media_title: "I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)",
    media_artist: "Technohead",
    // Pause + Seek + Volume Set + Volume Mute + Previous Track + Next Track + Play Media +
    // Select Source + Stop + Clear + Play + Shuffle Set + Browse Media
    supported_features: 195135,
    entity_picture: "/images/album_cover.jpg",
    media_duration: 300,
    media_position: 0,
    media_position_updated_at: new Date(
      // 23 seconds in
      new Date().getTime() - 23000
    ).toISOString(),
    volume_level: 0.5,
  }),
  getEntity("media_player", "stream_playing", "playing", {
    friendly_name: "Playing the Stream",
    media_content_type: "movie",
    media_title: "Epic sax guy 10 hours",
    app_name: "YouTube",
    entity_picture: "/images/frenck.jpg",
    // Pause + Next Track + Play + Browse Media
    supported_features: 147489,
  }),
  getEntity("media_player", "stream_paused", "paused", {
    friendly_name: "Paused the Stream",
    media_content_type: "movie",
    media_title: "Epic sax guy 10 hours",
    app_name: "YouTube",
    entity_picture: "/images/frenck.jpg",
    // Pause + Next Track + Play
    supported_features: 16417,
  }),
  getEntity("media_player", "stream_playing_previous", "playing", {
    friendly_name: 'Playing the Stream (with "previous" support)',
    media_content_type: "movie",
    media_title: "Epic sax guy 10 hours",
    app_name: "YouTube",
    entity_picture: "/images/frenck.jpg",
    // Pause + Previous Track + Play
    supported_features: 16401,
  }),
  getEntity("media_player", "tv_playing", "playing", {
    friendly_name: "Playing non-skip TV Show",
    media_content_type: "tvshow",
    media_title: "Chapter 1",
    media_series_title: "House of Cards",
    app_name: "Netflix",
    entity_picture: "/images/netflix.jpg",
    // Pause
    supported_features: 1,
  }),
  getEntity("media_player", "sonos_idle", "idle", {
    friendly_name: "Sonos Idle",
    // Pause + Seek + Volume Set + Volume Mute + Previous Track + Next Track + Play Media +
    // Select Source + Stop + Clear + Play + Shuffle Set
    supported_features: 64063,
    volume_level: 0.33,
    is_volume_muted: true,
  }),
  getEntity("media_player", "idle_browse_media", "idle", {
    friendly_name: "Idle waiting for Browse Media (e.g. Spotify)",
    // Pause + Seek + Volume Set + Previous Track + Next Track + Play Media +
    // Select Source + Play + Shuffle Set + Browse Media
    supported_features: 182839,
    volume_level: 0.79,
  }),
  getEntity("media_player", "theater_off", "off", {
    friendly_name: "TV Off",
    // On + Off + Play + Next + Pause
    supported_features: 16801,
  }),
  getEntity("media_player", "theater_on", "on", {
    friendly_name: "TV On",
    // On + Off + Play + Next + Pause
    supported_features: 16801,
  }),
  getEntity("media_player", "theater_off_static", "off", {
    friendly_name: "TV Off (cannot be switched on)",
    // Off + Next + Pause
    supported_features: 289,
  }),
  getEntity("media_player", "theater_on_static", "on", {
    friendly_name: "TV On (cannot be switched off)",
    // On + Next + Pause
    supported_features: 161,
  }),
  getEntity("media_player", "android_cast", "playing", {
    friendly_name: "Casting App (no supported features)",
    media_title: "Android Screen Casting",
    app_name: "Screen Mirroring",
  }),
  getEntity("media_player", "image_display", "playing", {
    friendly_name: "Digital Picture Frame",
    media_content_type: "image",
    media_title: "Famous Painting",
    media_artist: "Famous Artist",
    entity_picture: "/images/sunflowers.jpg",
    // On + Off + Browse Media
    supported_features: 131456,
  }),
  getEntity("media_player", "unavailable", "unavailable", {
    friendly_name: "Player Unavailable",
    // Pause + Volume Set + Volume Mute + Previous Track + Next Track +
    // Play Media + Stop + Play
    supported_features: 21437,
  }),
  getEntity("media_player", "unknown", "unknown", {
    friendly_name: "Player Unknown",
    // Pause + Volume Set + Volume Mute + Previous Track + Next Track +
    // Play Media + Stop + Play
    supported_features: 21437,
  }),
  getEntity("media_player", "playing", "playing", {
    friendly_name: "Player Playing (no Pause support)",
    // Volume Set + Volume Mute + Previous Track + Next Track +
    // Play Media + Stop + Play
    supported_features: 21436,
    volume_level: 1,
  }),
  getEntity("media_player", "idle", "idle", {
    friendly_name: "Player Idle",
    // Pause + Volume Set + Volume Mute + Previous Track + Next Track +
    // Play Media + Stop + Play
    supported_features: 21437,
    volume_level: 0,
  }),
  getEntity("media_player", "receiver_on", "on", {
    source_list: ["AirPlay", "Blu-Ray", "TV", "USB", "iPod (USB)"],
    volume_level: 0.63,
    is_volume_muted: false,
    source: "TV",
    friendly_name: "Receiver (selectable sources)",
    // Volume Set + Volume Mute + On + Off + Select Source + Play + Sound Mode
    supported_features: 84364,
  }),
  getEntity("media_player", "receiver_off", "off", {
    source_list: ["AirPlay", "Blu-Ray", "TV", "USB", "iPod (USB)"],
    friendly_name: "Receiver (selectable sources)",
    // Volume Set + Volume Mute + On + Off + Select Source + Play + Sound Mode
    supported_features: 84364,
  }),
];
