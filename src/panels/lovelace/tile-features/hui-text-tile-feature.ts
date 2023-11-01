import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { TextTileFeatureConfig } from "./types";
import "../../../components/ha-textfield";
import { UNAVAILABLE } from "../../../data/entity";

export const supportsTextTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "input_text" || domain === "text";
};

@customElement("hui-text-tile-feature")
class HuiTextTileFeature extends LitElement implements LovelaceTileFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: TextTileFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(): TextTileFeatureConfig {
    return {
      type: "text",
    };
  }

  public setConfig(config: TextTileFeatureConfig): void {
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

  private async _valueChanged(ev: CustomEvent) {
    const domain = computeDomain(this.stateObj!.entity_id);
    this.hass!.callService(domain, "set_value", {
      entity_id: this.stateObj!.entity_id,
      value: (ev.target as HTMLInputElement)?.value,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsTextTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    return html`
      <div class="container">
        <ha-textfield
          value=${this.stateObj.state}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          @change=${this._valueChanged}
        ></ha-textfield>
      </div>
    `;
  }

  static get styles() {
    return css`
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }

      ha-textfield {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-text-tile-feature": HuiTextTileFeature;
  }
}
