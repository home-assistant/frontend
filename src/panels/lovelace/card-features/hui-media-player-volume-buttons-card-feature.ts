import { mdiVolumeHigh, mdiVolumeOff } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { clamp } from "../../../common/number/clamp";
import "../../../components/ha-control-button";
import "../../../components/ha-control-number-buttons";
import "../../../components/ha-svg-icon";
import { forwardHaptic } from "../../../data/haptics";
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

    const stateObj = this._stateObj;
    const disabled = isUnavailableState(stateObj.state);
    const supportsMute = supportsFeature(
      stateObj,
      MediaPlayerEntityFeature.VOLUME_MUTE
    );
    const isMuted = stateObj.attributes.is_volume_muted;

    const position =
      stateObj.attributes.volume_level != null
        ? Math.round(stateObj.attributes.volume_level * 100)
        : undefined;

    return html`
      <ha-control-number-buttons
        .disabled=${disabled}
        .locale=${this.hass.locale}
        min="0"
        max="100"
        .step=${this._config.step ?? 5}
        .value=${position}
        unit="%"
        @value-changed=${this._valueChanged}
      ></ha-control-number-buttons>
      ${supportsMute
        ? html`
            <ha-control-button
              class="mute"
              .label=${this.hass.localize(
                `ui.card.media_player.${isMuted ? "media_volume_unmute" : "media_volume_mute"}`
              )}
              .disabled=${disabled}
              @click=${this._toggleMute}
            >
              <ha-svg-icon
                .path=${isMuted ? mdiVolumeOff : mdiVolumeHigh}
              ></ha-svg-icon>
            </ha-control-button>
          `
        : nothing}
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();

    this.hass!.callService("media_player", "volume_set", {
      entity_id: this._stateObj!.entity_id,
      volume_level: clamp(ev.detail.value, 0, 100) / 100,
    });
  }

  private _toggleMute(ev: Event) {
    ev.stopPropagation();
    forwardHaptic(this, "light");
    this.hass!.callService("media_player", "volume_mute", {
      entity_id: this._stateObj!.entity_id,
      is_volume_muted: !this._stateObj!.attributes.is_volume_muted,
    });
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        :host {
          display: flex;
          flex-direction: row;
          gap: var(--feature-button-spacing);
        }
        ha-control-number-buttons {
          flex: 1;
          min-width: 0;
        }
        .mute {
          width: var(--feature-height);
          height: var(--feature-height);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-volume-buttons-card-feature": HuiMediaPlayerVolumeButtonsCardFeature;
  }
}
