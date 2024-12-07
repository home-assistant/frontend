import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import "../../../components/ha-control-slider";
import { isUnavailableState } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type { MediaPlayerCardFeatureConfig } from "./types";

export const supportsMediaPlayerVolumeCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "media_player";
};

@customElement("hui-media-player-volume-card-feature")
class HuiMediaPlayerVolumeCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: MediaPlayerCardFeatureConfig;

  static getStubConfig(): MediaPlayerCardFeatureConfig {
    return {
      type: "media-player-volume",
    };
  }

  public setConfig(config: MediaPlayerCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsMediaPlayerVolumeCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    const position =
      this.stateObj.attributes.volume_level != null
        ? Math.round(this.stateObj.attributes.volume_level * 100)
        : undefined;

    return html`
      <ha-control-slider
        .value=${position}
        min="0"
        max="100"
        .showHandle=${stateActive(this.stateObj)}
        .disabled=${!this.stateObj || isUnavailableState(this.stateObj.state)}
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
      entity_id: this.stateObj!.entity_id,
      volume_level: value / 100,
    });
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-volume-card-feature": HuiMediaPlayerVolumeCardFeature;
  }
}
