import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
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
      name: Paused Music
    - entity: media_player.music_playing
      name: Playing Music
    - entity: media_player.stream_playing
      name: Playing Stream
    - entity: media_player.stream_paused
      name: Paused Stream
    - entity: media_player.stream_playing_previous
      name: Playing Stream (with "previous" support)
    - entity: media_player.tv_playing
      name: Playing non-skip TV Show
    - entity: media_player.android_cast
      name: Screen casting
    - entity: media_player.image_display
      name: Digital Picture Frame  
    - entity: media_player.sonos_idle
      name: Sonos Idle  
    - entity: media_player.idle_browse_media
      name: Idle waiting for Browse Media
    - entity: media_player.theater_off
      name: Player Off
    - entity: media_player.theater_on
      name: Player On
    - entity: media_player.theater_off_static
      name: Player Off (cannot be switched on)
    - entity: media_player.theater_on_static
      name: Player On (cannot be switched off)  
    - entity: media_player.idle
      name: Player Idle
    - entity: media_player.playing
      name: Player Playing
    - entity: media_player.unavailable
      name: Player Unavailable
    - entity: media_player.unknown
      name: Player Unknown
    - entity: media_player.receiver_on
      name: Receiver On (selectable sources)
    - entity: media_player.receiver_off
      name: Receiver Off (selectable sources)
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
    hass.updateTranslations(null, "en");
    hass.addEntities(createMediaPlayerEntities());
  }
}

customElements.define("demo-hui-media-player-rows", DemoHuiMediaPlayerRows);
