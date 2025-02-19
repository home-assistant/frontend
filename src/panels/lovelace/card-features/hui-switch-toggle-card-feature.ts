import { mdiPowerOff, mdiPower } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import { UNAVAILABLE } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type { SwitchToggleCardFeatureConfig } from "./types";

export const supportsSwitchToggleCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "switch";
};

@customElement("hui-switch-toggle-card-feature")
class HuiSwitchToggleCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: SwitchToggleCardFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(): SwitchToggleCardFeatureConfig {
    return {
      type: "switch-toggle",
    };
  }

  public setConfig(config: SwitchToggleCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsSwitchToggleCardFeature(this.stateObj)
    ) {
      return null;
    }

    const color = stateColorCss(this.stateObj);

    const options = ["on", "off"].map<ControlSelectOption>((entityState) => ({
      value: entityState,
      label: this.hass!.formatEntityState(this.stateObj!, entityState),
      path: entityState === "on" ? mdiPower : mdiPowerOff,
    }));

    return html`
      <ha-control-select
        .options=${options}
        .value=${this.stateObj.state}
        @value-changed=${this._valueChanged}
        hide-label
        .ariaLabel=${this.hass.localize("ui.card.humidifier.state")}
        style=${styleMap({
          "--control-select-color": color,
        })}
        .disabled=${this.stateObj!.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  private async _valueChanged(ev: CustomEvent) {
    const newState = (ev.detail as any).value;

    if (newState === this.stateObj!.state) return;

    const oldState = this.stateObj!.state;
    this._currentState = newState;

    try {
      await this._setState(newState);
    } catch (_err) {
      this._currentState = oldState;
    }
  }

  private async _setState(newState: string) {
    await this.hass!.callService(
      "switch",
      newState === "on" ? "turn_on" : "turn_off",
      {
        entity_id: this.stateObj!.entity_id,
      }
    );
  }

  static styles = cardFeatureStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-switch-toggle-card-feature": HuiSwitchToggleCardFeature;
  }
}
