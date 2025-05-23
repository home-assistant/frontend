import { mdiStop } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import {
  computeCloseIcon,
  computeOpenIcon,
} from "../../../common/entity/cover_icon";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import {
  canClose,
  canOpen,
  canStop,
  CoverEntityFeature,
  type CoverEntity,
} from "../../../data/cover";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  CoverOpenCloseCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsCoverOpenCloseCardFeature = (
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
    (supportsFeature(stateObj, CoverEntityFeature.OPEN) ||
      supportsFeature(stateObj, CoverEntityFeature.CLOSE))
  );
};

@customElement("hui-cover-open-close-card-feature")
class HuiCoverOpenCloseCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public context!: LovelaceCardFeatureContext;

  @state() private _config?: CoverOpenCloseCardFeatureConfig;

  private get _stateObj(): CoverEntity | undefined {
    return this.hass.states[this.context.entity_id!] as CoverEntity | undefined;
  }

  static getStubConfig(): CoverOpenCloseCardFeatureConfig {
    return {
      type: "cover-open-close",
    };
  }

  public setConfig(config: CoverOpenCloseCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "open_cover", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "close_cover", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "stop_cover", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this._stateObj ||
      !supportsCoverOpenCloseCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        ${supportsFeature(this._stateObj, CoverEntityFeature.OPEN)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.cover.open_cover")}
                @click=${this._onOpenTap}
                .disabled=${!canOpen(this._stateObj)}
              >
                <ha-svg-icon
                  .path=${computeOpenIcon(this._stateObj)}
                ></ha-svg-icon>
              </ha-control-button>
            `
          : nothing}
        ${supportsFeature(this._stateObj, CoverEntityFeature.STOP)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.cover.stop_cover")}
                @click=${this._onStopTap}
                .disabled=${!canStop(this._stateObj)}
              >
                <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
              </ha-control-button>
            `
          : nothing}
        ${supportsFeature(this._stateObj, CoverEntityFeature.CLOSE)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.cover.close_cover")}
                @click=${this._onCloseTap}
                .disabled=${!canClose(this._stateObj)}
              >
                <ha-svg-icon
                  .path=${computeCloseIcon(this._stateObj)}
                ></ha-svg-icon>
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
    "hui-cover-open-close-card-feature": HuiCoverOpenCloseCardFeature;
  }
}
