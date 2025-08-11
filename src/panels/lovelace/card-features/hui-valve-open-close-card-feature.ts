import { mdiStop, mdiValveClosed, mdiValveOpen } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import {
  canClose,
  canOpen,
  canStop,
  ValveEntityFeature,
  type ValveEntity,
} from "../../../data/valve";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  ValveOpenCloseCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsValveOpenCloseCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "valve" &&
    (supportsFeature(stateObj, ValveEntityFeature.OPEN) ||
      supportsFeature(stateObj, ValveEntityFeature.CLOSE))
  );
};

@customElement("hui-valve-open-close-card-feature")
class HuiValveOpenCloseCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: ValveOpenCloseCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as ValveEntity | undefined;
  }

  static getStubConfig(): ValveOpenCloseCardFeatureConfig {
    return {
      type: "valve-open-close",
    };
  }

  public setConfig(config: ValveOpenCloseCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("valve", "open_valve", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("valve", "close_valve", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("valve", "stop_valve", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsValveOpenCloseCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        ${supportsFeature(this._stateObj, ValveEntityFeature.CLOSE)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.valve.close_valve")}
                @click=${this._onCloseTap}
                .disabled=${!canClose(this._stateObj)}
              >
                <ha-svg-icon .path=${mdiValveClosed}></ha-svg-icon>
              </ha-control-button>
            `
          : nothing}
        ${supportsFeature(this._stateObj, ValveEntityFeature.STOP)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.valve.stop_valve")}
                @click=${this._onStopTap}
                .disabled=${!canStop(this._stateObj)}
              >
                <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
              </ha-control-button>
            `
          : nothing}
        ${supportsFeature(this._stateObj, ValveEntityFeature.OPEN)
          ? html`
              <ha-control-button
                .label=${this.hass.localize("ui.card.valve.open_valve")}
                @click=${this._onOpenTap}
                .disabled=${!canOpen(this._stateObj)}
              >
                <ha-svg-icon .path=${mdiValveOpen}></ha-svg-icon>
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
    "hui-valve-open-close-card-feature": HuiValveOpenCloseCardFeature;
  }
}
