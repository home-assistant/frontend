import { mdiLightbulb, mdiLightbulbOff, mdiPower, mdiPowerOff } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import {
  UNAVAILABLE,
  isOffState,
  isUnavailableState,
} from "../../../data/entity";
import { LightEntity } from "../../../data/light";
import { AutomationEntity } from "../../../data/automation";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { ToggleTileFeatureConfig } from "./types";
import "../../../components/ha-control-switch";
import { turnOnOffEntity } from "../common/entity/turn-on-off-entity";

export const supportsToggleTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return ["light", "switch", "input_boolean", "automation"].includes(domain);
};

@customElement("hui-toggle-tile-feature")
class HuiToggleTileFeature extends LitElement implements LovelaceTileFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?:
    | LightEntity
    | AutomationEntity
    | HassEntity;

  @state() private _config?: ToggleTileFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(): ToggleTileFeatureConfig {
    return {
      type: "toggle",
    };
  }

  public setConfig(config: ToggleTileFeatureConfig): void {
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

  private async _valueChanged(ev: Event) {
    const newState = ((ev.target as any).hasAttribute("checked") as boolean)
      ? "false"
      : "true";

    const oldState = this.stateObj!.state;

    if (newState === oldState) return;

    this._currentState = newState;

    try {
      await this._setState(newState);
    } catch (err) {
      this._currentState = oldState;
    }
  }

  private async _setState(newState: string) {
    turnOnOffEntity(this.hass!, this.stateObj!.entity_id, newState === "true");
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsToggleTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const stateObj = this.stateObj;

    const domain = computeDomain(stateObj.entity_id);

    return html`
      <div class="container">
        <ha-control-switch
          .pathOn=${domain === "light" ? mdiLightbulb : mdiPower}
          .pathOff=${domain === "light" ? mdiLightbulbOff : mdiPowerOff}
          .checked=${!isUnavailableState(stateObj.state) &&
          isOffState(stateObj.state)}
          .disabled=${isUnavailableState(stateObj.state)}
          @change=${this._valueChanged}
          hide-label
        >
        </ha-control-switch>
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-control-switch {
        --control-switch-on-color: var(--tile-color);
        --control-switch-thickness: 40px;
        --control-switch-border-radius: 10px;
      }
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-toggle-tile-feature": HuiToggleTileFeature;
  }
}
