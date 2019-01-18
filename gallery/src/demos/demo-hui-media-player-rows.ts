import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { getEntity } from "../../../src/fake_data/entity";
import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";

const ENTITIES = [
  getEntity("media_player", "bedroom", "playing", {
    media_content_type: "movie",
    media_title: "Epic sax guy 10 hours",
    app_name: "YouTube",
    supported_features: 32,
  }),
  getEntity("media_player", "family_room", "paused", {
    media_content_type: "music",
    media_title: "I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)",
    media_artist: "Technohead",
    supported_features: 16417,
  }),
  getEntity("media_player", "family_room_no_play", "paused", {
    media_content_type: "movie",
    media_title: "Epic sax guy 10 hours",
    app_name: "YouTube",
    supported_features: 33,
  }),
  getEntity("media_player", "living_room", "playing", {
    media_content_type: "tvshow",
    media_title: "Chapter 1",
    media_series_title: "House of Cards",
    app_name: "Netflix",
    supported_features: 1,
  }),
  getEntity("media_player", "lounge_room", "idle", {
    media_content_type: "music",
    media_title: "I Wanna Be A Hippy (Flamman & Abraxas Radio Mix)",
    media_artist: "Technohead",
    supported_features: 1,
  }),
  getEntity("media_player", "theater", "off", {
    media_content_type: "movie",
    media_title: "Epic sax guy 10 hours",
    app_name: "YouTube",
    supported_features: 33,
  }),
  getEntity("media_player", "android_cast", "playing", {
    media_title: "Android Screen Casting",
    app_name: "Screen Mirroring",
    supported_features: 21437,
  }),
];

const CONFIGS = [
  {
    heading: "Media Players",
    config: `
- type: entities
  entities:
    - entity: media_player.bedroom
      name: Skip, no pause
    - entity: media_player.family_room
      name: Paused, music
    - entity: media_player.family_room_no_play
      name: Paused, no play
    - entity: media_player.living_room
      name: Pause, No skip, tvshow
    - entity: media_player.android_cast
      name: Screen casting
    - entity: media_player.lounge_room
      name: Chromcast Idle
    - entity: media_player.theater
      name: 'Player Off'
    `,
  },
];

class DemoHuiMediaPlayerRows extends PolymerElement {
  static get template() {
    return html`
      <demo-cards
        id="demos"
        hass="[[hass]]"
        configs="[[_configs]]"
      ></demo-cards>
    `;
  }

  static get properties() {
    return {
      _configs: {
        type: Object,
        value: CONFIGS,
      },
      hass: Object,
    };
  }

  public ready() {
    super.ready();
    const hass = provideHass(this.$.demos);
    hass.addEntities(ENTITIES);
  }
}

customElements.define("demo-hui-media-player-rows", DemoHuiMediaPlayerRows);
