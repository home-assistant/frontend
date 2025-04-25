import "@material/mwc-button/mwc-button";

import {
  mdiLoginVariant,
  mdiMusicNote,
  mdiPlayBoxMultiple,
  mdiVolumeHigh,
  mdiVolumeMinus,
  mdiVolumeOff,
  mdiVolumePlus,
} from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-select";
import "../../../components/ha-slider";
import "../../../components/ha-svg-icon";
import { showMediaBrowserDialog } from "../../../components/media-player/show-media-browser-dialog";
import { isUnavailableState } from "../../../data/entity";
import type {
  MediaPickedEvent,
  MediaPlayerEntity,
} from "../../../data/media-player";
import {
  MediaPlayerEntityFeature,
  computeMediaControls,
  handleMediaControlClick,
  mediaPlayerPlayMedia,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-media_player")
class MoreInfoMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: MediaPlayerEntity;

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const stateObj = this.stateObj;
    const controls = computeMediaControls(stateObj, true);

    return html`
      <div class="controls">
        <div class="basic-controls">
          ${!controls
            ? ""
            : controls.map(
                (control) => html`
                  <ha-icon-button
                    action=${control.action}
                    @click=${this._handleClick}
                    .path=${control.icon}
                    .label=${this.hass.localize(
                      `ui.card.media_player.${control.action}`
                    )}
                  >
                  </ha-icon-button>
                `
              )}
        </div>
        ${!isUnavailableState(stateObj.state) &&
        supportsFeature(stateObj, MediaPlayerEntityFeature.BROWSE_MEDIA)
          ? html`
              <mwc-button
                .label=${this.hass.localize(
                  "ui.card.media_player.browse_media"
                )}
                @click=${this._showBrowseMedia}
              >
                <ha-svg-icon
                  .path=${mdiPlayBoxMultiple}
                  slot="icon"
                ></ha-svg-icon>
              </mwc-button>
            `
          : ""}
      </div>
      ${(supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET) ||
        supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_STEP)) &&
      stateActive(stateObj)
        ? html`
            <div class="volume">
              ${supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_MUTE)
                ? html`
                    <ha-icon-button
                      .path=${stateObj.attributes.is_volume_muted
                        ? mdiVolumeOff
                        : mdiVolumeHigh}
                      .label=${this.hass.localize(
                        `ui.card.media_player.${
                          stateObj.attributes.is_volume_muted
                            ? "media_volume_unmute"
                            : "media_volume_mute"
                        }`
                      )}
                      @click=${this._toggleMute}
                    ></ha-icon-button>
                  `
                : ""}
              ${supportsFeature(
                stateObj,
                MediaPlayerEntityFeature.VOLUME_SET
              ) ||
              supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_STEP)
                ? html`
                    <ha-icon-button
                      action="volume_down"
                      .path=${mdiVolumeMinus}
                      .label=${this.hass.localize(
                        "ui.card.media_player.media_volume_down"
                      )}
                      @click=${this._handleClick}
                    ></ha-icon-button>
                    <ha-icon-button
                      action="volume_up"
                      .path=${mdiVolumePlus}
                      .label=${this.hass.localize(
                        "ui.card.media_player.media_volume_up"
                      )}
                      @click=${this._handleClick}
                    ></ha-icon-button>
                  `
                : ""}
              ${supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET)
                ? html`
                    <ha-slider
                      labeled
                      id="input"
                      .value=${Number(stateObj.attributes.volume_level) * 100}
                      @change=${this._selectedValueChanged}
                    ></ha-slider>
                  `
                : ""}
            </div>
          `
        : ""}
      ${stateActive(stateObj) &&
      supportsFeature(stateObj, MediaPlayerEntityFeature.SELECT_SOURCE) &&
      stateObj.attributes.source_list?.length
        ? html`
            <div class="source-input">
              <ha-select
                .label=${this.hass.localize("ui.card.media_player.source")}
                icon
                .value=${stateObj.attributes.source!}
                @selected=${this._handleSourceChanged}
                fixedMenuPosition
                naturalMenuWidth
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.source_list!.map(
                  (source) => html`
                    <ha-list-item .value=${source}>
                      ${this.hass.formatEntityAttributeValue(
                        stateObj,
                        "source",
                        source
                      )}
                    </ha-list-item>
                  `
                )}
                <ha-svg-icon .path=${mdiLoginVariant} slot="icon"></ha-svg-icon>
              </ha-select>
            </div>
          `
        : nothing}
      ${stateActive(stateObj) &&
      supportsFeature(stateObj, MediaPlayerEntityFeature.SELECT_SOUND_MODE) &&
      stateObj.attributes.sound_mode_list?.length
        ? html`
            <div class="sound-input">
              <ha-select
                .label=${this.hass.localize("ui.card.media_player.sound_mode")}
                .value=${stateObj.attributes.sound_mode!}
                icon
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleSoundModeChanged}
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.sound_mode_list.map(
                  (mode) => html`
                    <ha-list-item .value=${mode}>
                      ${this.hass.formatEntityAttributeValue(
                        stateObj,
                        "sound_mode",
                        mode
                      )}
                    </ha-list-item>
                  `
                )}
                <ha-svg-icon .path=${mdiMusicNote} slot="icon"></ha-svg-icon>
              </ha-select>
            </div>
          `
        : ""}
    `;
  }

  static styles = css`
    ha-slider {
      flex-grow: 1;
    }

    ha-icon-button[action="turn_off"],
    ha-icon-button[action="turn_on"] {
      margin-right: auto;
      margin-left: inherit;
      margin-inline-start: inherit;
      margin-inline-end: auto;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      --mdc-theme-primary: currentColor;
      direction: ltr;
    }

    .basic-controls {
      display: inline-flex;
      flex-grow: 1;
    }

    .volume {
      direction: ltr;
    }

    .source-input,
    .sound-input {
      direction: var(--direction);
    }

    .volume,
    .source-input,
    .sound-input {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .source-input ha-select,
    .sound-input ha-select {
      margin-left: 10px;
      flex-grow: 1;
      margin-inline-start: 10px;
      margin-inline-end: initial;
      direction: var(--direction);
    }

    .tts {
      margin-top: 16px;
      font-style: italic;
    }

    mwc-button > ha-svg-icon {
      vertical-align: text-bottom;
    }
  `;

  private _handleClick(e: MouseEvent): void {
    handleMediaControlClick(
      this.hass!,
      this.stateObj!,
      (e.currentTarget as HTMLElement).getAttribute("action")!
    );
  }

  private _toggleMute() {
    this.hass!.callService("media_player", "volume_mute", {
      entity_id: this.stateObj!.entity_id,
      is_volume_muted: !this.stateObj!.attributes.is_volume_muted,
    });
  }

  private _selectedValueChanged(e: Event): void {
    this.hass!.callService("media_player", "volume_set", {
      entity_id: this.stateObj!.entity_id,
      volume_level: (e.target as any).value / 100,
    });
  }

  private _handleSourceChanged(e) {
    const newVal = e.target.value;

    if (!newVal || this.stateObj!.attributes.source === newVal) {
      return;
    }

    this.hass.callService("media_player", "select_source", {
      entity_id: this.stateObj!.entity_id,
      source: newVal,
    });
  }

  private _handleSoundModeChanged(e) {
    const newVal = e.target.value;

    if (!newVal || this.stateObj?.attributes.sound_mode === newVal) {
      return;
    }

    this.hass.callService("media_player", "select_sound_mode", {
      entity_id: this.stateObj!.entity_id,
      sound_mode: newVal,
    });
  }

  private _showBrowseMedia(): void {
    showMediaBrowserDialog(this, {
      action: "play",
      entityId: this.stateObj!.entity_id,
      mediaPickedCallback: (pickedMedia: MediaPickedEvent) =>
        mediaPlayerPlayMedia(
          this.hass,
          this.stateObj!.entity_id,
          pickedMedia.item.media_content_id,
          pickedMedia.item.media_content_type
        ),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-media_player": MoreInfoMediaPlayer;
  }
}
