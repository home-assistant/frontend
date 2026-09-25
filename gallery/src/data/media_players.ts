export const createMediaPlayerEntities = () => [
  {
    entity_id: "media_player.music_paused",
    state: "paused",
    attributes: {
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
      source_list: ["AirPlay", "Blu-Ray", "TV", "USB", "iPod (USB)"],
      source: "AirPlay",
      sound_mode_list: ["Movie", "Music", "Game", "Pure Audio"],
      sound_mode: "Music",
    },
  },
  {
    entity_id: "media_player.music_playing",
    state: "playing",
    attributes: {
      friendly_name: "Playing The Music",
      media_content_type: "music",
      media_title: "I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)",
      media_artist: "Technohead",
      // Pause + Seek + Volume Set + Volume Mute + Previous Track + Next Track + Play Media +
      // Select Source + Stop + Clear + Play + Shuffle Set + Browse Media + Grouping
      supported_features: 784959,
      entity_picture: "/images/album_cover.jpg",
      media_duration: 300,
      media_position: 0,
      media_position_updated_at: new Date(
        // 23 seconds in
        new Date().getTime() - 23000
      ).toISOString(),
      volume_level: 0.5,
      sound_mode_list: ["Movie", "Music", "Game", "Pure Audio"],
      sound_mode: "Music",
      group_members: ["media_player.playing", "media_player.stream_playing"],
    },
  },
  {
    entity_id: "media_player.stream_playing",
    state: "playing",
    attributes: {
      friendly_name: "Playing the Stream",
      media_content_type: "movie",
      media_title: "Epic sax guy 10 hours",
      app_name: "YouTube",
      entity_picture: "/images/frenck.jpg",
      // Pause + Next Track + Play + Browse Media
      supported_features: 147489,
    },
  },
  {
    entity_id: "media_player.stream_paused",
    state: "paused",
    attributes: {
      friendly_name: "Paused the Stream",
      media_content_type: "movie",
      media_title: "Epic sax guy 10 hours",
      app_name: "YouTube",
      entity_picture: "/images/frenck.jpg",
      // Pause + Next Track + Play
      supported_features: 16417,
    },
  },
  {
    entity_id: "media_player.stream_playing_previous",
    state: "playing",
    attributes: {
      friendly_name: 'Playing the Stream (with "previous" support)',
      media_content_type: "movie",
      media_title: "Epic sax guy 10 hours",
      app_name: "YouTube",
      entity_picture: "/images/frenck.jpg",
      // Pause + Previous Track + Play
      supported_features: 16401,
    },
  },
  {
    entity_id: "media_player.tv_playing",
    state: "playing",
    attributes: {
      friendly_name: "Playing non-skip TV Show",
      media_content_type: "tvshow",
      media_title: "Chapter 1",
      media_series_title: "House of Cards",
      app_name: "Netflix",
      entity_picture: "/images/netflix.jpg",
      // Pause
      supported_features: 1,
    },
  },
  {
    entity_id: "media_player.sonos_idle",
    state: "idle",
    attributes: {
      friendly_name: "Sonos Idle",
      // Pause + Seek + Volume Set + Volume Mute + Previous Track + Next Track + Play Media +
      // Select Source + Stop + Clear + Play + Shuffle Set
      supported_features: 64063,
      volume_level: 0.33,
      is_volume_muted: true,
    },
  },
  {
    entity_id: "media_player.idle_browse_media",
    state: "idle",
    attributes: {
      friendly_name: "Idle waiting for Browse Media (e.g. Spotify)",
      // Pause + Seek + Volume Set + Previous Track + Next Track + Play Media +
      // Select Source + Play + Shuffle Set + Browse Media
      supported_features: 182839,
      volume_level: 0.79,
    },
  },
  {
    entity_id: "media_player.theater_off",
    state: "off",
    attributes: {
      friendly_name: "TV Off",
      // On + Off + Play + Next + Pause
      supported_features: 16801,
    },
  },
  {
    entity_id: "media_player.theater_on",
    state: "on",
    attributes: {
      friendly_name: "TV On",
      // On + Off + Play + Next + Pause
      supported_features: 16801,
    },
  },
  {
    entity_id: "media_player.theater_off_static",
    state: "off",
    attributes: {
      friendly_name: "TV Off (cannot be switched on)",
      // Off + Next + Pause
      supported_features: 289,
    },
  },
  {
    entity_id: "media_player.theater_on_static",
    state: "on",
    attributes: {
      friendly_name: "TV On (cannot be switched off)",
      // On + Next + Pause
      supported_features: 161,
    },
  },
  {
    entity_id: "media_player.android_cast",
    state: "playing",
    attributes: {
      friendly_name: "Casting App (no supported features)",
      media_title: "Android Screen Casting",
      app_name: "Screen Mirroring",
    },
  },
  {
    entity_id: "media_player.image_display",
    state: "playing",
    attributes: {
      friendly_name: "Digital Picture Frame",
      media_content_type: "image",
      media_title: "Famous Painting",
      media_artist: "Famous Artist",
      entity_picture: "/images/sunflowers.jpg",
      // On + Off + Browse Media
      supported_features: 131456,
    },
  },
  {
    entity_id: "media_player.unavailable",
    state: "unavailable",
    attributes: {
      friendly_name: "Player Unavailable",
      // Pause + Volume Set + Volume Mute + Previous Track + Next Track +
      // Play Media + Stop + Play
      supported_features: 21437,
    },
  },
  {
    entity_id: "media_player.unknown",
    state: "unknown",
    attributes: {
      friendly_name: "Player Unknown",
      // Pause + Volume Set + Volume Mute + Previous Track + Next Track +
      // Play Media + Stop + Play
      supported_features: 21437,
    },
  },
  {
    entity_id: "media_player.playing",
    state: "playing",
    attributes: {
      friendly_name: "Player Playing (no Pause support)",
      // Volume Set + Volume Mute + Previous Track + Next Track +
      // Play Media + Stop + Play
      supported_features: 21436,
      volume_level: 1,
    },
  },
  {
    entity_id: "media_player.idle",
    state: "idle",
    attributes: {
      friendly_name: "Player Idle",
      // Pause + Volume Set + Volume Mute + Previous Track + Next Track +
      // Play Media + Stop + Play
      supported_features: 21437,
      volume_level: 0,
    },
  },
  {
    entity_id: "media_player.receiver_on",
    state: "on",
    attributes: {
      source_list: ["AirPlay", "Blu-Ray", "TV", "USB", "iPod (USB)"],
      sound_mode_list: ["Movie", "Music", "Game", "Pure Audio"],
      volume_level: 0.63,
      is_volume_muted: false,
      source: "TV",
      sound_mode: "Movie",
      friendly_name: "Receiver (selectable sources)",
      // Volume Set + Volume Mute + On + Off + Select Source + Play + Sound Mode
      supported_features: 84364,
    },
  },
  {
    entity_id: "media_player.receiver_off",
    state: "off",
    attributes: {
      source_list: ["AirPlay", "Blu-Ray", "TV", "USB", "iPod (USB)"],
      sound_mode_list: ["Movie", "Music", "Game", "Pure Audio"],
      friendly_name: "Receiver (selectable sources)",
      // Volume Set + Volume Mute + On + Off + Select Source + Play + Sound Mode
      supported_features: 84364,
    },
  },
];
