import { html, LitElement, nothing } from "lit";
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
      <ha-control-slider
        .value=${position}
        min="0"
        max="100"
        .showHandle=${stateActive(this._stateObj)}
        .disabled=${!this._stateObj || isUnavailableState(this._stateObj.state)}
        @value-changed=${this._valueChanged}
        unit="%"
        .locale=${this.hass.locale}
      ></ha-control-slider>
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

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-volume-slider-card-feature": HuiMediaPlayerVolumeSliderCardFeature;
  }
}
