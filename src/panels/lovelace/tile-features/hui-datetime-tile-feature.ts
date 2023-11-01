import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { DatetimeTileFeatureConfig } from "./types";
import "../../../components/ha-date-input";
import "../../../components/ha-base-time-input";
import { isUnavailableState } from "../../../data/entity";

export const supportsDatetimeTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "input_datetime";
};

@customElement("hui-datetime-tile-feature")
class HuiDatetimeTileFeature extends LitElement implements LovelaceTileFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: DatetimeTileFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(): DatetimeTileFeatureConfig {
    return {
      type: "datetime",
    };
  }

  public setConfig(config: DatetimeTileFeatureConfig): void {
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

  private async _dateChanged(ev: CustomEvent) {
    this.hass!.callService("input_datetime", "set_datetime", {
      entity_id: this.stateObj!.entity_id,
      date: ev.detail.value,
    });
  }

  private async _timeChanged(ev: CustomEvent) {
    const time = `${ev.detail.value.hours}:${ev.detail.value.minutes}:${ev.detail.value.seconds}`;
    this.hass!.callService("input_datetime", "set_datetime", {
      entity_id: this.stateObj!.entity_id,
      time,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsDatetimeTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    return html`
      <div class="container">
        ${this.stateObj.attributes.has_date
          ? html`
              <ha-date-input
                value=${this.stateObj.state.split(" ")[0]}
                .locale=${this.hass.locale}
                .disabled=${isUnavailableState(this.stateObj.state)}
                @value-changed=${this._dateChanged}
              ></ha-date-input>
            `
          : nothing}
        ${this.stateObj.attributes.has_time
          ? html`
              <ha-base-time-input
                format="24"
                hours=${this.stateObj.attributes.hour}
                minutes=${this.stateObj.attributes.minute}
                seconds=${this.stateObj.attributes.second}
                .locale=${this.hass.locale}
                .disabled=${isUnavailableState(this.stateObj.state)}
                @value-changed=${this._timeChanged}
              ></ha-base-time-input>
            `
          : nothing}
      </div>
    `;
  }

  static get styles() {
    return css`
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
        display: flex;
        gap: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-datetime-tile-feature": HuiDatetimeTileFeature;
  }
}
