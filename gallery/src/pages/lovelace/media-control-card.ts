import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { createMediaPlayerEntities } from "../../data/media_players";

const CONFIGS = [
  {
    heading: "Paused Music",
    config: `
  - type: media-control
    entity: media_player.music_paused
    `,
  },
  {
    heading: "Playing Music",
    config: `
  - type: media-control
    entity: media_player.music_playing
    `,
  },
  {
    heading: "Playing Stream",
    config: `
  - type: media-control
    entity: media_player.stream_playing
    `,
  },
  {
    heading: "Paused Stream",
    config: `
  - type: media-control
    entity: media_player.stream_paused
    `,
  },
  {
    heading: 'Playing Stream (with "previous" support)',
    config: `
  - type: media-control
    entity: media_player.stream_playing_previous
    `,
  },
  {
    heading: "Playing non-skip TV Show",
    config: `
  - type: media-control
    entity: media_player.tv_playing
    `,
  },
  {
    heading: "Screen Casting",
    config: `
  - type: media-control
    entity: media_player.android_cast
    `,
  },
  {
    heading: "Digital Picture Frame",
    config: `
  - type: media-control
    entity: media_player.image_display
    `,
  },
  {
    heading: "Sonos Idle",
    config: `
  - type: media-control
    entity: media_player.sonos_idle
    `,
  },
  {
    heading: "Idle waiting for Browse Media",
    config: `
  - type: media-control
    entity: media_player.idle_browse_media
    `,
  },
  {
    heading: "Player Off",
    config: `
  - type: media-control
    entity: media_player.theater_off
    `,
  },
  {
    heading: "Player On",
    config: `
  - type: media-control
    entity: media_player.theater_on
    `,
  },
  {
    heading: "Player Off (cannot be switched on)",
    config: `
  - type: media-control
    entity: media_player.theater_off_static
    `,
  },
  {
    heading: "Player On (cannot be switched off)",
    config: `
  - type: media-control
    entity: media_player.theater_on_static
    `,
  },
  {
    heading: "Player Idle",
    config: `
  - type: media-control
    entity: media_player.idle
    `,
  },
  {
    heading: "Player Playing",
    config: `
  - type: media-control
    entity: media_player.playing
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
  {
    heading: "Receiver On (selectable sources)",
    config: `
  - type: media-control
    entity: media_player.receiver_on
    `,
  },
  {
    heading: "Receiver Off (selectable sources)",
    config: `
  - type: media-control
    entity: media_player.receiver_off
    `,
  },
  {
    heading: "Grid Full Size",
    config: `
  - type: grid
    columns: 1
    cards:
    - type: media-control
      entity: media_player.music_paused
    `,
  },
];

@customElement("demo-lovelace-media-control-card")
class DemoHuiMediaControlCard extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(createMediaPlayerEntities());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-media-control-card": DemoHuiMediaControlCard;
  }
}
