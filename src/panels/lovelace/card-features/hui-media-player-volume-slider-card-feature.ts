import { html, LitElement, nothing, css } from "lit";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { mdiMinus, mdiPlus } from "@mdi/js";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-slider";
import { isUnavailableState } from "../../../data/entity";
import {
  MediaPlayerEntityFeature,
  type MediaPlayerEntity,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerVolumeSliderCardFeatureConfig,
} from "./types";

export const supportsMediaPlayerVolumeSliderCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "media_player" &&
    supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET)
  );
};

@customElement("hui-media-player-volume-slider-card-feature")
class HuiMediaPlayerVolumeSliderCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: MediaPlayerVolumeSliderCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | MediaPlayerEntity
      | undefined;
  }

  static getStubConfig(): MediaPlayerVolumeSliderCardFeatureConfig {
    return {
      type: "media-player-volume-slider",
    };
  }

  public setConfig(config: MediaPlayerVolumeSliderCardFeatureConfig): void {
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
      !this._stateObj ||
      !supportsMediaPlayerVolumeSliderCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const position =
      this._stateObj.attributes.volume_level != null
        ? Math.round(this._stateObj.attributes.volume_level * 100)
        : undefined;

    return html`
      <div class="volume-controls">
        <!-- Minus Button -->
        <ha-icon-button
          .path=${mdiMinus}
          @click=${this._adjustVolumeMinus}
          .disabled=${!this._stateObj ||
          isUnavailableState(this._stateObj.state)}
        ></ha-icon-button>

        <!-- Volume Slider -->
        <ha-control-slider
          .value=${position}
          min="0"
          max="100"
          .showHandle=${stateActive(this._stateObj)}
          .disabled=${!this._stateObj ||
          isUnavailableState(this._stateObj.state)}
          @value-changed=${this._valueChanged}
          unit="%"
          .locale=${this.hass.locale}
        ></ha-control-slider>

        <!-- Plus Button -->
        <ha-icon-button
          .path=${mdiPlus}
          @click=${this._adjustVolumePlus}
          .disabled=${!this._stateObj ||
          isUnavailableState(this._stateObj.state)}
        ></ha-icon-button>

        <!-- Percentage Display -->
        <span class="volume-percentage">${position}%</span>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this.hass!.callService("media_player", "volume_set", {
      entity_id: this._stateObj!.entity_id,
      volume_level: value / 100,
    });
  }

  private _adjustVolume(delta: number) {
    const currentVolume = this._stateObj!.attributes.volume_level * 100;
    const newVolume = Math.max(0, Math.min(100, currentVolume + delta));

    this.hass!.callService("media_player", "volume_set", {
      entity_id: this._stateObj!.entity_id,
      volume_level: newVolume / 100,
    });
  }

  private _adjustVolumeMinus = () => {
    this._adjustVolume(-5);
  };

  private _adjustVolumePlus = () => {
    this._adjustVolume(5);
  };

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        .volume-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .volume-percentage {
          min-width: 40px;
          text-align: center;
          font-weight: bold;
        }
        ha-control-slider {
          flex-grow: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-volume-slider-card-feature": HuiMediaPlayerVolumeSliderCardFeature;
  }
}
