import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiPower,
  mdiSkipNext,
  mdiSkipPrevious,
  mdiStop,
} from "@mdi/js";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerPlaybackCardFeatureConfig,
} from "./types";
import type {
  ControlButton,
  MediaPlayerEntity,
} from "../../../data/media-player";
import { MediaPlayerEntityFeature } from "../../../data/media-player";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-button";
import "../../../components/ha-icon-button";
import { stateActive } from "../../../common/entity/state_active";
import { isUnavailableState } from "../../../data/entity";
import "../../../components/ha-icon";

export const supportsMediaPlayerPlaybackCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "media_player";
};

@customElement("hui-media-player-playback-card-feature")
class HuiMediaPlayerPlaybackCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state() private _config?: MediaPlayerPlaybackCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | MediaPlayerEntity
      | undefined;
  }

  static getStubConfig(): MediaPlayerPlaybackCardFeatureConfig {
    return {
      type: "media-player-playback",
    };
  }

  public setConfig(config: MediaPlayerPlaybackCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !supportsMediaPlayerPlaybackCardFeature(this.hass, this.context) ||
      !this._stateObj
    ) {
      return nothing;
    }

    const entityState = this._stateObj.state;
    const controlButton = this._computeControlButton(this._stateObj);
    const assumedState = this._stateObj.attributes.assumed_state === true;

    const buttons = html` ${(entityState === "playing" || assumedState) &&
    supportsFeature(this._stateObj, MediaPlayerEntityFeature.PREVIOUS_TRACK)
      ? html`
          <ha-control-button
            .label=${this.hass.localize(
              "ui.card.media_player.media_previous_track"
            )}
            @click=${this._previousTrack}
          >
            <ha-svg-icon .path=${mdiSkipPrevious}></ha-svg-icon>
          </ha-control-button>
        `
      : ""}
    ${!assumedState &&
    ((entityState === "playing" &&
      (supportsFeature(this._stateObj, MediaPlayerEntityFeature.PAUSE) ||
        supportsFeature(this._stateObj, MediaPlayerEntityFeature.STOP))) ||
      ((entityState === "paused" || entityState === "idle") &&
        supportsFeature(this._stateObj, MediaPlayerEntityFeature.PLAY)) ||
      (entityState === "on" &&
        (supportsFeature(this._stateObj, MediaPlayerEntityFeature.PLAY) ||
          supportsFeature(this._stateObj, MediaPlayerEntityFeature.PAUSE))))
      ? html`
          <ha-control-button
            .label=${this.hass.localize(
              `ui.card.media_player.${controlButton.action}`
            )}
            @click=${this._playPauseStop}
          >
            <ha-svg-icon .path=${controlButton.icon}></ha-svg-icon>
          </ha-control-button>
        `
      : ""}
    ${assumedState &&
    supportsFeature(this._stateObj, MediaPlayerEntityFeature.PLAY)
      ? html`
          <ha-control-button
            .label=${this.hass.localize(`ui.card.media_player.media_play`)}
            @click=${this._play}
          >
            <ha-svg-icon .path=${mdiPlay}></ha-svg-icon>
          </ha-control-button>
        `
      : ""}
    ${assumedState &&
    supportsFeature(this._stateObj, MediaPlayerEntityFeature.PAUSE)
      ? html`
          <ha-control-button
            .label=${this.hass.localize(`ui.card.media_player.media_pause`)}
            @click=${this._pause}
          >
            <ha-svg-icon .path=${mdiPause}></ha-svg-icon>
          </ha-control-button>
        `
      : ""}
    ${assumedState &&
    supportsFeature(this._stateObj, MediaPlayerEntityFeature.STOP) &&
    !supportsFeature(this._stateObj, MediaPlayerEntityFeature.VOLUME_SET)
      ? html`
          <ha-control-button
            .label=${this.hass.localize(`ui.card.media_player.media_stop`)}
            @click=${this._stop}
          >
            <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
          </ha-control-button>
        `
      : ""}
    ${(entityState === "playing" ||
      (assumedState &&
        !supportsFeature(
          this._stateObj,
          MediaPlayerEntityFeature.VOLUME_SET
        ))) &&
    supportsFeature(this._stateObj, MediaPlayerEntityFeature.NEXT_TRACK)
      ? html`
          <ha-control-button
            .label=${this.hass.localize(
              "ui.card.media_player.media_next_track"
            )}
            @click=${this._nextTrack}
          >
            <ha-svg-icon .path=${mdiSkipNext}></ha-svg-icon>
          </ha-control-button>
        `
      : ""}`;

    return html`
      <ha-control-button-group>
        ${supportsFeature(this._stateObj, MediaPlayerEntityFeature.TURN_OFF) &&
        stateActive(this._stateObj)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.media_player.turn_off")}
                @click=${this._togglePower}
              >
                <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
              </ha-control-button>
            `
          : ""}
        ${supportsFeature(this._stateObj, MediaPlayerEntityFeature.TURN_ON) &&
        !stateActive(this._stateObj) &&
        !isUnavailableState(entityState)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.media_player.turn_on")}
                @click=${this._togglePower}
              >
                <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
              </ha-control-button>
            `
          : !supportsFeature(
                this._stateObj,
                MediaPlayerEntityFeature.VOLUME_SET
              ) &&
              !supportsFeature(
                this._stateObj,
                MediaPlayerEntityFeature.VOLUME_STEP
              )
            ? buttons
            : ""}
      </ha-control-button-group>
    `;
  }

  private _computeControlButton(stateObj: MediaPlayerEntity): ControlButton {
    return stateObj.state === "on"
      ? { icon: mdiPlayPause, action: "media_play_pause" }
      : stateObj.state !== "playing"
        ? { icon: mdiPlay, action: "media_play" }
        : supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE)
          ? { icon: mdiPause, action: "media_pause" }
          : { icon: mdiStop, action: "media_stop" };
  }

  private _togglePower(): void {
    if (!this._stateObj) return;
    this.hass!.callService(
      "media_player",
      stateActive(this._stateObj) ? "turn_off" : "turn_on",
      {
        entity_id: this._stateObj.entity_id,
      }
    );
  }

  private _playPauseStop(): void {
    if (!this._stateObj) return;
    const service =
      this._stateObj!.state !== "playing"
        ? "media_play"
        : supportsFeature(this._stateObj!, MediaPlayerEntityFeature.PAUSE)
          ? "media_pause"
          : "media_stop";

    this.hass!.callService("media_player", service, {
      entity_id: this._stateObj.entity_id,
    });
  }

  private _play(): void {
    if (!this._stateObj) return;
    this.hass!.callService("media_player", "media_play", {
      entity_id: this._stateObj.entity_id,
    });
  }

  private _pause(): void {
    if (!this._stateObj) return;
    this.hass!.callService("media_player", "media_pause", {
      entity_id: this._stateObj.entity_id,
    });
  }

  private _stop(): void {
    if (!this._stateObj) return;
    this.hass!.callService("media_player", "media_stop", {
      entity_id: this._stateObj.entity_id,
    });
  }

  private _previousTrack(): void {
    if (!this._stateObj) return;
    this.hass!.callService("media_player", "media_previous_track", {
      entity_id: this._stateObj.entity_id,
    });
  }

  private _nextTrack(): void {
    if (!this._stateObj) return;
    this.hass!.callService("media_player", "media_next_track", {
      entity_id: this._stateObj.entity_id,
    });
  }

  static styles = cardFeatureStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-playback-card-feature": HuiMediaPlayerPlaybackCardFeature;
  }
}
