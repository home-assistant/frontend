import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select/mwc-select";
import {
  mdiLoginVariant,
  mdiMusicNote,
  mdiPlayBoxMultiple,
  mdiVolumeHigh,
  mdiVolumeMinus,
  mdiVolumeOff,
  mdiVolumePlus,
} from "@mdi/js";
import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/ha-icon-button";
import "../../../components/ha-slider";
import "../../../components/ha-svg-icon";
import { showMediaBrowserDialog } from "../../../components/media-player/show-media-browser-dialog";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity";
import {
  computeMediaControls,
  MediaPickedEvent,
  MediaPlayerEntity,
  SUPPORT_BROWSE_MEDIA,
  SUPPORT_PLAY_MEDIA,
  SUPPORT_SELECT_SOUND_MODE,
  SUPPORT_SELECT_SOURCE,
  SUPPORT_VOLUME_BUTTONS,
  SUPPORT_VOLUME_MUTE,
  SUPPORT_VOLUME_SET,
} from "../../../data/media-player";
import { HomeAssistant } from "../../../types";

@customElement("more-info-media_player")
class MoreInfoMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: MediaPlayerEntity;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    const stateObj = this.stateObj;
    const controls = computeMediaControls(stateObj);

    return html`
      ${!controls
        ? ""
        : html`
            <div class="controls">
              <div class="basic-controls">
                ${controls!.map(
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
              ${supportsFeature(stateObj, SUPPORT_BROWSE_MEDIA)
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
          `}
      ${(supportsFeature(stateObj, SUPPORT_VOLUME_SET) ||
        supportsFeature(stateObj, SUPPORT_VOLUME_BUTTONS)) &&
      ![UNAVAILABLE, UNKNOWN, "off"].includes(stateObj.state)
        ? html`
            <div class="volume">
              ${supportsFeature(stateObj, SUPPORT_VOLUME_MUTE)
                ? html`
                    <ha-icon-button
                      .path=${stateObj.attributes.is_volume_muted
                        ? mdiVolumeOff
                        : mdiVolumeHigh}
                      @click=${this._toggleMute}
                    ></ha-icon-button>
                  `
                : ""}
              ${supportsFeature(stateObj, SUPPORT_VOLUME_BUTTONS)
                ? html`
                    <ha-icon-button
                      action="volume_down"
                      .path=${mdiVolumeMinus}
                      @click=${this._handleClick}
                    ></ha-icon-button>
                    <ha-icon-button
                      action="volume_up"
                      .path=${mdiVolumePlus}
                      @click=${this._handleClick}
                    ></ha-icon-button>
                  `
                : ""}
              ${supportsFeature(stateObj, SUPPORT_VOLUME_SET)
                ? html`
                    <ha-slider
                      id="input"
                      pin
                      ignore-bar-touch
                      .dir=${computeRTLDirection(this.hass!)}
                      .value=${Number(stateObj.attributes.volume_level) * 100}
                      @change=${this._selectedValueChanged}
                    ></ha-slider>
                  `
                : ""}
            </div>
          `
        : ""}
      ${![UNAVAILABLE, UNKNOWN, "off"].includes(stateObj.state) &&
      supportsFeature(stateObj, SUPPORT_SELECT_SOURCE) &&
      stateObj.attributes.source_list?.length
        ? html`
            <div class="source-input">
              <ha-svg-icon
                class="source-input"
                .path=${mdiLoginVariant}
              ></ha-svg-icon>
              <mwc-select
                .label=${this.hass.localize("ui.card.media_player.source")}
                .value=${stateObj.attributes.source!}
                @selected=${this._handleSourceChanged}
                fixedMenuPosition
                naturalMenuWidth
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.source_list!.map(
                  (source) =>
                    html`
                      <mwc-list-item .value=${source}>${source}</mwc-list-item>
                    `
                )}
              </mwc-select>
            </div>
          `
        : ""}
      ${supportsFeature(stateObj, SUPPORT_SELECT_SOUND_MODE) &&
      stateObj.attributes.sound_mode_list?.length
        ? html`
            <div class="sound-input">
              <ha-svg-icon .path=${mdiMusicNote}></ha-svg-icon>
              <mwc-select
                .label=${this.hass.localize("ui.card.media_player.sound_mode")}
                .value=${stateObj.attributes.sound_mode!}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleSoundModeChanged}
                @closed=${stopPropagation}
              >
                ${stateObj.attributes.sound_mode_list.map(
                  (mode) => html`
                    <mwc-list-item .value=${mode}>${mode}</mwc-list-item>
                  `
                )}
              </mwc-select>
            </div>
          `
        : ""}
      ${isComponentLoaded(this.hass, "tts") &&
      supportsFeature(stateObj, SUPPORT_PLAY_MEDIA)
        ? html`
            <div class="tts">
              Text to speech has moved to the media browser.
            </div>
          `
        : ""}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-icon-button[action="turn_off"],
      ha-icon-button[action="turn_on"],
      ha-slider {
        flex-grow: 1;
      }

      .controls {
        display: flex;
        align-items: center;
        --mdc-theme-primary: currentColor;
      }

      .basic-controls {
        flex-grow: 1;
      }

      .volume,
      .source-input,
      .sound-input {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .source-input ha-svg-icon,
      .sound-input ha-svg-icon {
        padding: 7px;
        margin-top: 24px;
      }

      .source-input mwc-select,
      .sound-input mwc-select {
        margin-left: 10px;
        flex-grow: 1;
      }

      .tts {
        margin-top: 16px;
        font-style: italic;
      }

      mwc-button > ha-svg-icon {
        vertical-align: text-bottom;
      }
    `;
  }

  private _handleClick(e: MouseEvent): void {
    this.hass!.callService(
      "media_player",
      (e.currentTarget! as HTMLElement).getAttribute("action")!,
      {
        entity_id: this.stateObj!.entity_id,
      }
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
      volume_level:
        Number((e.currentTarget! as HTMLElement).getAttribute("value")!) / 100,
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
        this._playMedia(
          pickedMedia.item.media_content_id,
          pickedMedia.item.media_content_type
        ),
    });
  }

  private _playMedia(media_content_id: string, media_content_type: string) {
    this.hass!.callService("media_player", "play_media", {
      entity_id: this.stateObj!.entity_id,
      media_content_id,
      media_content_type,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-media_player": MoreInfoMediaPlayer;
  }
}
