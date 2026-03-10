import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { clamp } from "../../../common/number/clamp";
import "../../../components/ha-control-number-buttons";
import { isUnavailableState } from "../../../data/entity/entity";
import {
  MediaPlayerEntityFeature,
  type MediaPlayerEntity,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerVolumeButtonsCardFeatureConfig,
} from "./types";

export const supportsMediaPlayerVolumeButtonsCardFeature = (
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

@customElement("hui-media-player-volume-buttons-card-feature")
class HuiMediaPlayerVolumeButtonsCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: MediaPlayerVolumeButtonsCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id] as
      | MediaPlayerEntity
      | undefined;
  }

  static getStubConfig(): MediaPlayerVolumeButtonsCardFeatureConfig {
    return {
      type: "media-player-volume-buttons",
      step: 5,
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-media-player-volume-buttons-card-feature-editor");
    return document.createElement(
      "hui-media-player-volume-buttons-card-feature-editor"
    );
  }

  public setConfig(config: MediaPlayerVolumeButtonsCardFeatureConfig): void {
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
      !supportsMediaPlayerVolumeButtonsCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const position =
      this._stateObj.attributes.volume_level != null
        ? Math.round(this._stateObj.attributes.volume_level * 100)
        : undefined;

    return html`
      <ha-control-number-buttons
        .disabled=${!this._stateObj || isUnavailableState(this._stateObj.state)}
        .locale=${this.hass.locale}
        min="0"
        max="100"
        .step=${this._config.step ?? 5}
        .value=${position}
        unit="%"
        @value-changed=${this._valueChanged}
      ></ha-control-number-buttons>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();

    this.hass!.callService("media_player", "volume_set", {
      entity_id: this._stateObj!.entity_id,
      volume_level: clamp(ev.detail.value, 0, 100) / 100,
    });
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-volume-buttons-card-feature": HuiMediaPlayerVolumeButtonsCardFeature;
  }
}
