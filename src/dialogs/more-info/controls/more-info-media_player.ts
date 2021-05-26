import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button";
import { mdiPlayBoxMultiple } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-paper-dropdown-menu";
import "../../../components/ha-slider";
import "../../../components/ha-svg-icon";
import { showMediaBrowserDialog } from "../../../components/media-player/show-media-browser-dialog";
import { UNAVAILABLE, UNAVAILABLE_STATES, UNKNOWN } from "../../../data/entity";
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

  @query("#ttsInput") private _ttsInput?: HTMLInputElement;

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
                      .icon=${control.icon}
                      @click=${this._handleClick}
                    ></ha-icon-button>
                  `
                )}
              </div>
              ${supportsFeature(stateObj, SUPPORT_BROWSE_MEDIA)
                ? html`
                    <mwc-icon-button
                      .title=${this.hass.localize(
                        "ui.card.media_player.browse_media"
                      )}
                      @click=${this._showBrowseMedia}
                      ><ha-svg-icon .path=${mdiPlayBoxMultiple}></ha-svg-icon
                    ></mwc-icon-button>
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
                      .icon=${stateObj.attributes.is_volume_muted
                        ? "hass:volume-off"
                        : "hass:volume-high"}
                      @click=${this._toggleMute}
                    ></ha-icon-button>
                  `
                : ""}
              ${supportsFeature(stateObj, SUPPORT_VOLUME_BUTTONS)
                ? html`
                    <ha-icon-button
                      action="volume_down"
                      icon="hass:volume-minus"
                      @click=${this._handleClick}
                    ></ha-icon-button>
                    <ha-icon-button
                      action="volume_up"
                      icon="hass:volume-plus"
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
              <ha-icon class="source-input" icon="hass:login-variant"></ha-icon>
              <ha-paper-dropdown-menu
                .label=${this.hass.localize("ui.card.media_player.source")}
              >
                <paper-listbox
                  slot="dropdown-content"
                  attr-for-selected="item-name"
                  .selected=${stateObj.attributes.source!}
                  @iron-select=${this._handleSourceChanged}
                >
                  ${stateObj.attributes.source_list!.map(
                    (source) =>
                      html`
                        <paper-item .itemName=${source}>${source}</paper-item>
                      `
                  )}
                </paper-listbox>
              </ha-paper-dropdown-menu>
            </div>
          `
        : ""}
      ${supportsFeature(stateObj, SUPPORT_SELECT_SOUND_MODE) &&
      stateObj.attributes.sound_mode_list?.length
        ? html`
            <div class="sound-input">
              <ha-icon icon="hass:music-note"></ha-icon>
              <ha-paper-dropdown-menu
                dynamic-align
                label-float
                .label=${this.hass.localize("ui.card.media_player.sound_mode")}
              >
                <paper-listbox
                  slot="dropdown-content"
                  attr-for-selected="item-name"
                  .selected=${stateObj.attributes.sound_mode!}
                  @iron-select=${this._handleSoundModeChanged}
                >
                  ${stateObj.attributes.sound_mode_list.map(
                    (mode) => html`
                      <paper-item .itemName=${mode}>${mode}</paper-item>
                    `
                  )}
                </paper-listbox>
              </ha-paper-dropdown-menu>
            </div>
          `
        : ""}
      ${isComponentLoaded(this.hass, "tts") &&
      supportsFeature(stateObj, SUPPORT_PLAY_MEDIA)
        ? html`
            <div class="tts">
              <paper-input
                id="ttsInput"
                .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
                .label=${this.hass.localize(
                  "ui.card.media_player.text_to_speak"
                )}
                @keydown=${this._ttsCheckForEnter}
              ></paper-input>
              <ha-icon-button
                icon="hass:send"
                .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
                @click=${this._sendTTS}
              ></ha-icon-button>
            </div>
          </div>
          `
        : ""}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-icon-button[action="turn_off"],
      ha-icon-button[action="turn_on"],
      ha-slider,
      #ttsInput {
        flex-grow: 1;
      }

      .controls {
        display: flex;
        align-items: center;
      }

      .basic-controls {
        flex-grow: 1;
      }

      .volume,
      .source-input,
      .sound-input,
      .tts {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .source-input ha-icon,
      .sound-input ha-icon {
        padding: 7px;
        margin-top: 24px;
      }

      .source-input ha-paper-dropdown-menu,
      .sound-input ha-paper-dropdown-menu {
        margin-left: 10px;
        flex-grow: 1;
      }

      paper-item {
        cursor: pointer;
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

  private _handleSourceChanged(e: CustomEvent) {
    const newVal = e.detail.item.itemName;

    if (!newVal || this.stateObj!.attributes.source === newVal) {
      return;
    }

    this.hass.callService("media_player", "select_source", {
      entity_id: this.stateObj!.entity_id,
      source: newVal,
    });
  }

  private _handleSoundModeChanged(e: CustomEvent) {
    const newVal = e.detail.item.itemName;

    if (!newVal || this.stateObj?.attributes.sound_mode === newVal) {
      return;
    }

    this.hass.callService("media_player", "select_sound_mode", {
      entity_id: this.stateObj!.entity_id,
      sound_mode: newVal,
    });
  }

  private _ttsCheckForEnter(e: KeyboardEvent) {
    if (e.keyCode === 13) this._sendTTS();
  }

  private _sendTTS() {
    const ttsInput = this._ttsInput;
    if (!ttsInput) {
      return;
    }

    const services = this.hass.services.tts;
    const serviceKeys = Object.keys(services).sort();

    const service = serviceKeys.find((key) => key.indexOf("_say") !== -1);

    if (!service) {
      return;
    }

    this.hass.callService("tts", service, {
      entity_id: this.stateObj!.entity_id,
      message: ttsInput.value,
    });
    ttsInput.value = "";
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
