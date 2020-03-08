import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { provideHass } from "../../../src/fake_data/provide_hass";
import "../components/demo-cards";
import { createMediaPlayerEntities } from "../data/media_players";

const CONFIGS = [
  {
    heading: "Skip, no pause",
    config: `
  - type: media-control
    entity: media_player.bedroom
    `,
  },
  {
    heading: "Paused, music",
    config: `
  - type: media-control
    entity: media_player.family_room
    `,
  },
  {
    heading: "Paused, no play",
    config: `
  - type: media-control
    entity: media_player.family_room_no_play
    `,
  },
  {
    heading: "Pause, No skip, tvshow",
    config: `
  - type: media-control
    entity: media_player.living_room
    `,
  },
  {
    heading: "Screen casting",
    config: `
  - type: media-control
    entity: media_player.android_cast
    `,
  },
  {
    heading: "Chromcast Idle",
    config: `
  - type: media-control
    entity: media_player.lounge_room
    `,
  },
  {
    heading: "Player Off",
    config: `
  - type: media-control
    entity: media_player.theater
    `,
  },
  {
    heading: "Player Unavailable",
    config: `
  - type: media-control
    entity: media_player.unavailable
    `,
  },
  {
    heading: "Player Unknown",
    config: `
  - type: media-control
    entity: media_player.unknown
    `,
  },
];

class DemoHuiMediaPlayerCard extends PolymerElement {
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

customElements.define("demo-hui-media-player-card", DemoHuiMediaPlayerCard);
