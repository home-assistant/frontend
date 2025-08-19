import type { PropertyValues } from "lit";
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
import { stateActive } from "../../../common/entity/state_active";
import { isUnavailableState } from "../../../data/entity";
import { debounce } from "../../../common/util/debounce";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-button";
import "../../../components/ha-icon-button";
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

  @state() private _narrow?: boolean = false;

  private _resizeObserver?: ResizeObserver;

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
    return (
      hasConfigOrEntityChanged(this, changedProps) ||
      changedProps.size > 1 ||
      !changedProps.has("hass")
    );
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

    const buttons = this._computeButtons(this._stateObj);

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
        !isUnavailableState(this._stateObj.state)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.media_player.turn_on")}
                @click=${this._togglePower}
              >
                <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
              </ha-control-button>
            `
          : buttons.map(
              (button) => html`
                <ha-control-button
                  key=${button.action}
                  .label=${this.hass!.localize(
                    `ui.card.media_player.${button.action}`
                  )}
                  @click=${this._action}
                >
                  <ha-svg-icon .path=${button.icon}></ha-svg-icon>
                </ha-control-button>
              `
            )}
      </ha-control-button-group>
    `;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
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
    const host = (this.getRootNode() as ShadowRoot).host as
      | HTMLElement
      | undefined;
    const width = host?.clientWidth ?? this.clientWidth ?? 0;
    this._narrow = width < 300;
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

  private _computeButtons(stateObj: MediaPlayerEntity): ControlButton[] {
    const controlButton = this._computeControlButton(stateObj);
    const assumedState = stateObj.attributes.assumed_state === true;

    const controls: ControlButton[] = [];

    if (
      !this._narrow &&
      (stateObj.state === "playing" || assumedState) &&
      supportsFeature(stateObj, MediaPlayerEntityFeature.PREVIOUS_TRACK)
    ) {
      controls.push({ icon: mdiSkipPrevious, action: "media_previous_track" });
    }

    if (
      !assumedState &&
      ((stateObj.state === "playing" &&
        (supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE) ||
          supportsFeature(stateObj, MediaPlayerEntityFeature.STOP))) ||
        ((stateObj.state === "paused" || stateObj.state === "idle") &&
          supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY)) ||
        (stateObj.state === "on" &&
          (supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY) ||
            supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE))))
    ) {
      controls.push({ icon: controlButton.icon, action: controlButton.action });
    }

    if (assumedState) {
      if (supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY)) {
        controls.push({ icon: mdiPlay, action: "media_play" });
      }

      if (supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE)) {
        controls.push({ icon: mdiPause, action: "media_pause" });
      }

      if (supportsFeature(stateObj, MediaPlayerEntityFeature.STOP)) {
        controls.push({ icon: mdiStop, action: "media_stop" });
      }
    }

    if (
      (stateObj.state === "playing" || assumedState) &&
      supportsFeature(stateObj, MediaPlayerEntityFeature.NEXT_TRACK)
    ) {
      controls.push({ icon: mdiSkipNext, action: "media_next_track" });
    }

    return controls;
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

  private _action(e: Event): void {
    const action = (e.target as HTMLElement).getAttribute("key");
    if (!action) return;

    switch (action) {
      case "media_play_pause":
        this._playPauseStop();
        break;
      case "media_play":
        this._play();
        break;
      case "media_pause":
        this._pause();
        break;
      case "media_stop":
        this._stop();
        break;
      case "media_previous_track":
        this._previousTrack();
        break;
      case "media_next_track":
        this._nextTrack();
        break;
    }
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
