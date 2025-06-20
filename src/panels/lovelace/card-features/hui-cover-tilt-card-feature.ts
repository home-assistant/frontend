import { mdiArrowBottomLeft, mdiArrowTopRight, mdiStop } from "@mdi/js";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import {
  CoverEntityFeature,
  canCloseTilt,
  canOpenTilt,
  canStopTilt,
  type CoverEntity,
} from "../../../data/cover";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  CoverTiltCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsCoverTiltCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "cover" &&
    (supportsFeature(stateObj, CoverEntityFeature.OPEN_TILT) ||
      supportsFeature(stateObj, CoverEntityFeature.CLOSE_TILT))
  );
};

@customElement("hui-cover-tilt-card-feature")
class HuiCoverTiltCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: CoverTiltCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as CoverEntity | undefined;
  }

  static getStubConfig(): CoverTiltCardFeatureConfig {
    return {
      type: "cover-tilt",
    };
  }

  public setConfig(config: CoverTiltCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "open_cover_tilt", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "close_cover_tilt", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "stop_cover_tilt", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsCoverTiltCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        ${supportsFeature(this._stateObj, CoverEntityFeature.OPEN_TILT)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.cover.open_tilt_cover")}
                @click=${this._onOpenTap}
                .disabled=${!canOpenTilt(this._stateObj)}
              >
                <ha-svg-icon .path=${mdiArrowTopRight}></ha-svg-icon>
              </ha-control-button>
            `
          : nothing}
        ${supportsFeature(this._stateObj, CoverEntityFeature.STOP_TILT)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.cover.stop_cover")}
                @click=${this._onStopTap}
                .disabled=${!canStopTilt(this._stateObj)}
              >
                <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
              </ha-control-button>
            `
          : nothing}
        ${supportsFeature(this._stateObj, CoverEntityFeature.CLOSE_TILT)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.cover.close_tilt_cover")}
                @click=${this._onCloseTap}
                .disabled=${!canCloseTilt(this._stateObj)}
              >
                <ha-svg-icon .path=${mdiArrowBottomLeft}></ha-svg-icon>
              </ha-control-button>
            `
          : nothing}
      </ha-control-button-group>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-tilt-card-feature": HuiCoverTiltCardFeature;
  }
}
