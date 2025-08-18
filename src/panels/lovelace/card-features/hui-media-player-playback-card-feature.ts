import { LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerPlaybackCardFeatureConfig,
} from "./types";

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
      !supportsMediaPlayerPlaybackCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    // Placeholder feature: renders nothing for now
    return nothing;
  }

  static styles = cardFeatureStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-playback-card-feature": HuiMediaPlayerPlaybackCardFeature;
  }
}
