import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";
import { createMediaPlayerEntities } from "../data/media_players";

const CONFIGS = [
  {
    heading: "Media Players",
    config: `
- type: entities
  entities:
    - entity: media_player.music_paused
      name: Paused music
    - entity: media_player.music_playing
      name: Playing music
    - entity: media_player.stream_playing
      name: Paused, no play
    - entity: media_player.living_room
      name: Pause, No skip, tvshow
    - entity: media_player.android_cast
      name: Screen casting
    - entity: media_player.lounge_room
      name: Chromcast Idle
    - entity: media_player.theater
      name: Player Off
    - entity: media_player.unavailable
      name: Player Unavailable
    - entity: media_player.unknown
      name: Player Unknown
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
    hass.addEntities(createMediaPlayerEntities());
  }
}

customElements.define("demo-hui-media-player-rows", DemoHuiMediaPlayerRows);
