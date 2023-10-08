import {
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiPower,
  mdiSkipNext,
  mdiSkipPrevious,
  mdiStop,
  mdiVolumeHigh,
  mdiVolumeMinus,
  mdiVolumeOff,
  mdiVolumePlus,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-icon-button";
import "../../../components/ha-slider";
import { isUnavailableState } from "../../../data/entity";
import {
  ControlButton,
  MediaPlayerEntity,
  MediaPlayerEntityFeature,
  computeMediaDescription,
} from "../../../data/media-player";
import { loadPolyfillIfNeeded } from "../../../resources/resize-observer.polyfill";
import type { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-media-player-entity-row")
class HuiMediaPlayerEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntityConfig;

  @state() private _narrow?: boolean = false;

  @state() private _veryNarrow?: boolean = false;

  private _resizeObserver?: ResizeObserver;

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Entity must be specified");
    }

    this._config = config;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._attachObserver();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.unobserve(this);
  }

  public willUpdate(): void {
    if (!this.hasUpdated) {
      this._measureCard();
    }
  }

  protected firstUpdated(): void {
    this._attachObserver();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.hass.states[this._config.entity] as MediaPlayerEntity;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const entityState = stateObj.state;
    const controlButton = this._computeControlButton(stateObj);
    const assumedState = stateObj.attributes.assumed_state === true;

    const buttons = html`
      ${!this._narrow &&
      (entityState === "playing" || assumedState) &&
      supportsFeature(stateObj, MediaPlayerEntityFeature.PREVIOUS_TRACK)
        ? html`
            <ha-icon-button
              .path=${mdiSkipPrevious}
              .label=${this.hass.localize(
                "ui.card.media_player.media_previous_track"
              )}
              @click=${this._previousTrack}
            ></ha-icon-button>
          `
        : ""}
      ${!assumedState &&
      ((entityState === "playing" &&
        (supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE) ||
          supportsFeature(stateObj, MediaPlayerEntityFeature.STOP))) ||
        ((entityState === "paused" || entityState === "idle") &&
          supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY)) ||
        (entityState === "on" &&
          (supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY) ||
            supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE))))
        ? html`
            <ha-icon-button
              .path=${controlButton.icon}
              .label=${this.hass.localize(
                `ui.card.media_player.${controlButton.action}`
              )}
              @click=${this._playPauseStop}
            ></ha-icon-button>
          `
        : ""}
      ${assumedState && supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY)
        ? html`
            <ha-icon-button
              .path=${mdiPlay}
              .label=${this.hass.localize(`ui.card.media_player.media_play`)}
              @click=${this._play}
            ></ha-icon-button>
          `
        : ""}
      ${assumedState &&
      supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE)
        ? html`
            <ha-icon-button
              .path=${mdiPause}
              .label=${this.hass.localize(`ui.card.media_player.media_pause`)}
              @click=${this._pause}
            ></ha-icon-button>
          `
        : ""}
      ${assumedState &&
      supportsFeature(stateObj, MediaPlayerEntityFeature.STOP) &&
      !supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET)
        ? html`
            <ha-icon-button
              .path=${mdiStop}
              .label=${this.hass.localize(`ui.card.media_player.media_stop`)}
              @click=${this._stop}
            ></ha-icon-button>
          `
        : ""}
      ${(entityState === "playing" ||
        (assumedState &&
          !supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET))) &&
      supportsFeature(stateObj, MediaPlayerEntityFeature.NEXT_TRACK)
        ? html`
            <ha-icon-button
              .path=${mdiSkipNext}
              .label=${this.hass.localize(
                "ui.card.media_player.media_next_track"
              )}
              @click=${this._nextTrack}
            ></ha-icon-button>
          `
        : ""}
    `;

    const mediaDescription = computeMediaDescription(stateObj);

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        .secondaryText=${mediaDescription ||
        this.hass.formatEntityState(stateObj)}
      >
        <div class="controls">
          ${supportsFeature(stateObj, MediaPlayerEntityFeature.TURN_ON) &&
          !stateActive(stateObj) &&
          !isUnavailableState(entityState)
            ? html`
                <ha-icon-button
                  .path=${mdiPower}
                  .label=${this.hass.localize("ui.card.media_player.turn_on")}
                  @click=${this._togglePower}
                ></ha-icon-button>
              `
            : !supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET) &&
              !supportsFeature(
                stateObj,
                MediaPlayerEntityFeature.VOLUME_BUTTONS
              )
            ? buttons
            : ""}
          ${supportsFeature(stateObj, MediaPlayerEntityFeature.TURN_OFF) &&
          stateActive(stateObj)
            ? html`
                <ha-icon-button
                  .path=${mdiPower}
                  .label=${this.hass.localize("ui.card.media_player.turn_off")}
                  @click=${this._togglePower}
                ></ha-icon-button>
              `
            : ""}
        </div>
      </hui-generic-entity-row>
      ${(supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET) ||
        supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_BUTTONS)) &&
      stateActive(stateObj)
        ? html`
            <div class="flex">
              <div class="volume">
                ${supportsFeature(
                  stateObj,
                  MediaPlayerEntityFeature.VOLUME_MUTE
                )
                  ? html`
                      <ha-icon-button
                        .path=${stateObj.attributes.is_volume_muted
                          ? mdiVolumeOff
                          : mdiVolumeHigh}
                        .label=${this.hass.localize(
                          `ui.card.media_player.${
                            stateObj.attributes.is_volume_muted
                              ? "media_volume_mute"
                              : "media_volume_unmute"
                          }`
                        )}
                        @click=${this._toggleMute}
                      ></ha-icon-button>
                    `
                  : ""}
                ${!this._veryNarrow &&
                supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET)
                  ? html`
                      <ha-slider
                        labeled
                        .dir=${computeRTLDirection(this.hass!)}
                        .value=${Number(stateObj.attributes.volume_level) * 100}
                        @change=${this._selectedValueChanged}
                        id="input"
                      ></ha-slider>
                    `
                  : !this._veryNarrow &&
                    supportsFeature(
                      stateObj,
                      MediaPlayerEntityFeature.VOLUME_BUTTONS
                    )
                  ? html`
                      <ha-icon-button
                        .path=${mdiVolumeMinus}
                        .label=${this.hass.localize(
                          "ui.card.media_player.media_volume_down"
                        )}
                        @click=${this._volumeDown}
                      ></ha-icon-button>
                      <ha-icon-button
                        .path=${mdiVolumePlus}
                        .label=${this.hass.localize(
                          "ui.card.media_player.media_volume_up"
                        )}
                        @click=${this._volumeUp}
                      ></ha-icon-button>
                    `
                  : ""}
              </div>

              <div class="controls">${buttons}</div>
            </div>
          `
        : ""}
    `;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      await loadPolyfillIfNeeded();
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }
    this._resizeObserver.observe(this);
  }

  private _measureCard() {
    if (!this.isConnected) {
      return;
    }
    this._narrow = (this.clientWidth || 0) < 300;
    this._veryNarrow = (this.clientWidth || 0) < 225;
  }

  private _computeControlButton(stateObj: HassEntity): ControlButton {
    return stateObj.state === "on"
      ? { icon: mdiPlayPause, action: "media_play_pause" }
      : stateObj.state !== "playing"
      ? { icon: mdiPlay, action: "media_play" }
      : supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE)
      ? { icon: mdiPause, action: "media_pause" }
      : { icon: mdiStop, action: "media_stop" };
  }

  private _togglePower(): void {
    const stateObj = this.hass!.states[this._config!.entity];

    this.hass!.callService(
      "media_player",
      stateActive(stateObj) ? "turn_off" : "turn_on",
      {
        entity_id: this._config!.entity,
      }
    );
  }

  private _playPauseStop(): void {
    const stateObj = this.hass!.states[this._config!.entity];

    const service =
      stateObj.state !== "playing"
        ? "media_play"
        : supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE)
        ? "media_pause"
        : "media_stop";

    this.hass!.callService("media_player", service, {
      entity_id: this._config!.entity,
    });
  }

  private _play(): void {
    this.hass!.callService("media_player", "media_play", {
      entity_id: this._config!.entity,
    });
  }

  private _pause(): void {
    this.hass!.callService("media_player", "media_pause", {
      entity_id: this._config!.entity,
    });
  }

  private _stop(): void {
    this.hass!.callService("media_player", "media_stop", {
      entity_id: this._config!.entity,
    });
  }

  private _previousTrack(): void {
    this.hass!.callService("media_player", "media_previous_track", {
      entity_id: this._config!.entity,
    });
  }

  private _nextTrack(): void {
    this.hass!.callService("media_player", "media_next_track", {
      entity_id: this._config!.entity,
    });
  }

  private _toggleMute() {
    this.hass!.callService("media_player", "volume_mute", {
      entity_id: this._config!.entity,
      is_volume_muted:
        !this.hass!.states[this._config!.entity].attributes.is_volume_muted,
    });
  }

  private _volumeDown() {
    this.hass!.callService("media_player", "volume_down", {
      entity_id: this._config!.entity,
    });
  }

  private _volumeUp() {
    this.hass!.callService("media_player", "volume_up", {
      entity_id: this._config!.entity,
    });
  }

  private _selectedValueChanged(ev): void {
    this.hass!.callService("media_player", "volume_set", {
      entity_id: this._config!.entity,
      volume_level: ev.target.value / 100,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
      .flex {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .volume {
        display: flex;
        flex-grow: 2;
        flex-shrink: 2;
      }
      .controls {
        white-space: nowrap;
        direction: ltr;
      }
      ha-slider {
        flex-grow: 2;
        flex-shrink: 2;
        width: 100%;
        margin: 0 -8px 0 1px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-entity-row": HuiMediaPlayerEntityRow;
  }
}
