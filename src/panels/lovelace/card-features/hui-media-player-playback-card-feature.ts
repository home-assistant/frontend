import {
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiPower,
  mdiPowerOff,
  mdiPowerOn,
  mdiSkipNext,
  mdiSkipPrevious,
  mdiStop,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import { isUnavailableState } from "../../../data/entity/entity";
import type {
  ControlButton,
  MediaPlayerEntity,
} from "../../../data/media-player";
import {
  computeMediaControls,
  MediaPlayerEntityFeature,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import { hasConfigChanged } from "../common/has-changed";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import {
  MEDIA_PLAYER_PLAYBACK_CONTROLS,
  type MediaPlayerPlaybackControl,
  type LovelaceCardFeatureContext,
  type MediaPlayerPlaybackCardFeatureConfig,
} from "./types";

const MEDIA_PLAYER_PLAYBACK_CONTROLS_FEATURES: Record<
  MediaPlayerPlaybackControl,
  MediaPlayerEntityFeature[]
> = {
  turn_on: [MediaPlayerEntityFeature.TURN_ON],
  turn_off: [MediaPlayerEntityFeature.TURN_OFF],
  media_play: [MediaPlayerEntityFeature.PLAY],
  media_pause: [MediaPlayerEntityFeature.PAUSE],
  media_play_pause: [
    MediaPlayerEntityFeature.PLAY,
    MediaPlayerEntityFeature.PAUSE,
  ],
  media_stop: [MediaPlayerEntityFeature.STOP],
  media_previous_track: [MediaPlayerEntityFeature.PREVIOUS_TRACK],
  media_next_track: [MediaPlayerEntityFeature.NEXT_TRACK],
};

export const supportsMediaPlayerPlaybackControl = (
  stateObj: MediaPlayerEntity,
  control: MediaPlayerPlaybackControl
): boolean =>
  MEDIA_PLAYER_PLAYBACK_CONTROLS_FEATURES[control].some((feature) =>
    supportsFeature(stateObj, feature)
  );

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

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id] as
      | MediaPlayerEntity
      | undefined;
  }

  private get _controls(): MediaPlayerPlaybackControl[] {
    return this._config?.controls?.length
      ? this._config.controls
      : [...MEDIA_PLAYER_PLAYBACK_CONTROLS];
  }

  static getStubConfig(): MediaPlayerPlaybackCardFeatureConfig {
    return {
      type: "media-player-playback",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-media-player-playback-card-feature-editor");
    return document.createElement(
      "hui-media-player-playback-card-feature-editor"
    );
  }

  public setConfig(config: MediaPlayerPlaybackCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  public willUpdate(): void {
    if (!this.hasUpdated) {
      this._measureCard();
    }
  }

  protected shouldUpdate(changedProps: PropertyValues<this>): boolean {
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const entityId = this.context?.entity_id;
    return (
      hasConfigChanged(this, changedProps) ||
      (changedProps.has("hass") &&
        (!oldHass ||
          !entityId ||
          oldHass.states[entityId] !== this.hass!.states[entityId]))
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
        ${buttons.map(
          (button) => html`
            <ha-control-button
              key=${button.action}
              .label=${this.hass?.localize(
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

  private _measureCard() {
    if (!this.isConnected) {
      return;
    }
    const host = (this.getRootNode() as ShadowRoot).host as
      | HTMLElement
      | undefined;
    const width = host?.clientWidth ?? this.clientWidth ?? 0;
    this._narrow = width < 200;
  }

  private _computeButtons(stateObj: MediaPlayerEntity): ControlButton[] {
    if (this._config?.controls?.length) {
      return this._filterNarrow(this._computeExplicitButtons(stateObj));
    }
    return this._filterNarrow(computeMediaControls(stateObj) ?? []);
  }

  /**
   * Controls are explicitly configured: iterate in config order,
   * show each supported control as its own button.
   */
  private _computeExplicitButtons(
    stateObj: MediaPlayerEntity
  ): ControlButton[] {
    const active = stateActive(stateObj);
    const assumedState = stateObj.attributes.assumed_state === true;
    const buttons: ControlButton[] = [];

    for (const control of this._controls) {
      switch (control) {
        case "turn_off":
          if (
            (active || assumedState) &&
            supportsFeature(stateObj, MediaPlayerEntityFeature.TURN_OFF)
          ) {
            buttons.push({
              icon: assumedState ? mdiPowerOff : mdiPower,
              action: "turn_off",
            });
          }
          break;
        case "turn_on":
          if (
            (!active || assumedState) &&
            !isUnavailableState(stateObj.state) &&
            supportsFeature(stateObj, MediaPlayerEntityFeature.TURN_ON)
          ) {
            buttons.push({
              icon: assumedState ? mdiPowerOn : mdiPower,
              action: "turn_on",
            });
          }
          break;
        case "media_play":
          if (supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY)) {
            buttons.push({ icon: mdiPlay, action: "media_play" });
          }
          break;
        case "media_pause":
          if (supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE)) {
            buttons.push({ icon: mdiPause, action: "media_pause" });
          }
          break;
        case "media_play_pause":
          if (
            supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY) ||
            supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE)
          ) {
            buttons.push({ icon: mdiPlayPause, action: "media_play_pause" });
          }
          break;
        case "media_stop":
          if (supportsFeature(stateObj, MediaPlayerEntityFeature.STOP)) {
            buttons.push({ icon: mdiStop, action: "media_stop" });
          }
          break;
        case "media_previous_track":
          if (
            supportsFeature(stateObj, MediaPlayerEntityFeature.PREVIOUS_TRACK)
          ) {
            buttons.push({
              icon: mdiSkipPrevious,
              action: "media_previous_track",
            });
          }
          break;
        case "media_next_track":
          if (supportsFeature(stateObj, MediaPlayerEntityFeature.NEXT_TRACK)) {
            buttons.push({ icon: mdiSkipNext, action: "media_next_track" });
          }
          break;
      }
    }

    return buttons;
  }

  private _filterNarrow(buttons: ControlButton[]): ControlButton[] {
    if (this._narrow && buttons.length > 3) {
      return buttons.filter(
        (b) =>
          b.action !== "media_previous_track" && b.action !== "media_next_track"
      );
    }
    return buttons;
  }

  private _action(e: Event): void {
    if (!this._stateObj) return;
    const action = (e.currentTarget as HTMLElement).getAttribute("key");
    if (!action) return;

    if (action === "media_play_pause") {
      // Resolve play_pause to the appropriate service based on state
      const service =
        this._stateObj.state !== "playing"
          ? "media_play"
          : supportsFeature(this._stateObj, MediaPlayerEntityFeature.PAUSE)
            ? "media_pause"
            : "media_stop";
      this.hass!.callService("media_player", service, {
        entity_id: this._stateObj.entity_id,
      });
      return;
    }

    this.hass!.callService("media_player", action, {
      entity_id: this._stateObj.entity_id,
    });
  }

  static styles = [
    cardFeatureStyles,
    css`
      ha-control-button-group {
        overflow: hidden;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-playback-card-feature": HuiMediaPlayerPlaybackCardFeature;
  }
}
