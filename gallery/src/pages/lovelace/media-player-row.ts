import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, query } from "lit/decorators";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import "../../components/demo-cards";
import { createMediaPlayerEntities } from "../../data/media_players";

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

@customElement("demo-lovelace-media-player-row")
class DemoHuiMediaPlayerRow extends LitElement {
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
    "demo-lovelace-media-player-rows": DemoHuiMediaPlayerRow;
  }
}
