import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { isOffState, isUnavailableState } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature, LovelaceTileFeatureEditor } from "../types";
import { MediaControlsTileFeatureConfig } from "./types";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-icon";
import { supportsFeature } from "../../../common/entity/supports-feature";
import {
  MediaPlayerEntity,
  MediaPlayerEntityFeature,
} from "../../../data/media-player";

export const MEDIA_CONTROLS = [
  "power",
  "browse_media",
  "play_pause",
  "shuffle",
  "repeat",
] as const;

export const REPEAT_MODES = ["off", "all", "one"] as const;

export const supportsMediaControlsTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "media_player";
};

@customElement("hui-media-controls-tile-feature")
class HuiMediaControlsTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: MediaPlayerEntity;

  @state() private _config?: MediaControlsTileFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(
    _,
    stateObj?: HassEntity
  ): MediaControlsTileFeatureConfig {
    if (!stateObj) {
      return {
        type: "media-controls",
        controls: [],
      };
    }

    const controls: MediaControlsTileFeatureConfig["controls"] = [];

    if (supportsFeature(stateObj, MediaPlayerEntityFeature.TURN_ON)) {
      controls.push("power");
    }

    if (supportsFeature(stateObj, MediaPlayerEntityFeature.BROWSE_MEDIA)) {
      controls.push("browse_media");
    }

    if (supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY)) {
      controls.push("play_pause");
    }

    if (supportsFeature(stateObj, MediaPlayerEntityFeature.SHUFFLE_SET)) {
      controls.push("shuffle");
    }

    if (supportsFeature(stateObj, MediaPlayerEntityFeature.REPEAT_SET)) {
      controls.push("repeat");
    }

    return {
      type: "media-controls",
      controls,
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileFeatureEditor> {
    await import(
      "../editor/config-elements/hui-media-controls-tile-feature-editor"
    );
    return document.createElement("hui-media-controls-tile-feature-editor");
  }

  public setConfig(config: MediaControlsTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentState = this.stateObj.state;
    }
  }

  private async _togglePower() {
    const stateObj = this.stateObj!;

    if (isUnavailableState(stateObj.state)) {
      return;
    }

    if (isOffState(stateObj.state)) {
      await this.hass!.callService("media_player", "turn_on", {
        entity_id: stateObj.entity_id,
      });
    } else {
      await this.hass!.callService("media_player", "turn_off", {
        entity_id: stateObj.entity_id,
      });
    }
  }

  private async _playMedia() {
    // open media browser
  }

  private async _togglePlayPause() {
    const stateObj = this.stateObj!;

    if (isUnavailableState(stateObj.state)) {
      return;
    }

    if (this._currentState === "playing") {
      await this.hass!.callService("media_player", "media_pause", {
        entity_id: stateObj.entity_id,
      });
    } else {
      await this.hass!.callService("media_player", "media_play", {
        entity_id: stateObj.entity_id,
      });
    }
  }

  private async _toggleShuffle() {
    const stateObj = this.stateObj!;

    if (isUnavailableState(stateObj.state)) {
      return;
    }

    await this.hass!.callService("media_player", "shuffle_set", {
      entity_id: stateObj.entity_id,
      shuffle: !stateObj.attributes.shuffle,
    });
  }

  private async _cycleRepeat() {
    const stateObj = this.stateObj!;

    if (isUnavailableState(stateObj.state)) {
      return;
    }

    const currentMode = stateObj.attributes
      .repeat! as (typeof REPEAT_MODES)[number];

    const currentIndex = REPEAT_MODES.indexOf(currentMode);

    const newMode =
      currentIndex === REPEAT_MODES.length - 1
        ? REPEAT_MODES[0]
        : REPEAT_MODES[currentIndex + 1];

    await this.hass!.callService("media_player", "repeat_set", {
      entity_id: stateObj.entity_id,
      repeat: newMode,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsMediaControlsTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const stateObj = this.stateObj;

    return html`
      <div class="container">
        <ha-control-button-group>
          ${this._config.controls.map((control) => {
            switch (control) {
              case "power":
                return html`
                  <ha-control-button
                    .disabled=${isUnavailableState(stateObj.state)}
                    @click=${this._togglePower}
                    title=${isOffState(stateObj.state)
                      ? this.hass!.localize("ui.card.media_player.turn_on")
                      : this.hass!.localize("ui.card.media_player.turn_off")}
                  >
                    <ha-icon icon="mdi:power"></ha-icon>
                  </ha-control-button>
                `;
              case "browse_media":
                return html`
                  <ha-control-button
                    .disabled=${isOffState(stateObj.state)}
                    @click=${this._playMedia}
                    title=${this.hass!.localize(
                      "ui.card.media_player.browse_media"
                    )}
                  >
                    <ha-icon icon="mdi:folder-music"></ha-icon>
                  </ha-control-button>
                `;
              case "play_pause":
                return html`
                  <ha-control-button
                    .disabled=${isOffState(stateObj.state)}
                    @click=${this._togglePlayPause}
                    title=${this.hass!.localize(
                      "ui.card.media_player.media_play_pause"
                    )}
                  >
                    <ha-icon
                      icon=${this._currentState === "playing"
                        ? "mdi:pause"
                        : "mdi:play"}
                    ></ha-icon>
                  </ha-control-button>
                `;
              case "shuffle":
                return html`
                  <ha-control-button
                    .disabled=${isOffState(stateObj.state)}
                    @click=${this._toggleShuffle}
                    title=${this.hass!.localize(
                      "ui.card.media_player.shuffle_set"
                    )}
                  >
                    <ha-icon
                      icon=${stateObj.attributes.shuffle
                        ? "mdi:shuffle"
                        : "mdi:shuffle-disabled"}
                    ></ha-icon>
                  </ha-control-button>
                `;
              case "repeat":
                return html`
                  <ha-control-button
                    .disabled=${isOffState(stateObj.state)}
                    @click=${this._cycleRepeat}
                    title=${this.hass!.localize(
                      "ui.card.media_player.repeat_set"
                    )}
                  >
                    <ha-icon
                      icon=${stateObj.attributes.repeat === "all"
                        ? "mdi:repeat"
                        : stateObj.attributes.repeat === "one"
                        ? "mdi:repeat-once"
                        : "mdi:repeat-off"}
                    ></ha-icon>
                  </ha-control-button>
                `;
              default:
                return nothing;
            }
          })}
        </ha-control-button-group>
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-control-button {
        --control-button-background-color: var(--tile-color);
        width: 100%;
      }
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-controls-tile-feature": HuiMediaControlsTileFeature;
  }
}
