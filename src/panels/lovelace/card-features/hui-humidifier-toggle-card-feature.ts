import { mdiPower, mdiWaterPercent } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColor } from "../../../common/entity/state_color";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import { UNAVAILABLE } from "../../../data/entity";
import type {
  HumidifierEntity,
  HumidifierState,
} from "../../../data/humidifier";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  HumidifierToggleCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsHumidifierToggleCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "humidifier";
};

@customElement("hui-humidifier-toggle-card-feature")
class HuiHumidifierToggleCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: HumidifierToggleCardFeatureConfig;

  @state() _currentState?: HumidifierState;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | HumidifierEntity
      | undefined;
  }

  static getStubConfig(): HumidifierToggleCardFeatureConfig {
    return {
      type: "humidifier-toggle",
    };
  }

  public setConfig(config: HumidifierToggleCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (
      (changedProp.has("hass") || changedProp.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context!.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._currentState = this._stateObj.state as HumidifierState;
      }
    }
  }

  private async _valueChanged(ev: CustomEvent) {
    const newState = (ev.detail as any).value as HumidifierState;

    if (newState === this._stateObj!.state) return;

    const oldState = this._stateObj!.state as HumidifierState;
    this._currentState = newState;

    try {
      await this._setState(newState);
    } catch (_err) {
      this._currentState = oldState;
    }
  }

  private async _setState(newState: HumidifierState) {
    await this.hass!.callService(
      "humidifier",
      newState === "on" ? "turn_on" : "turn_off",
      {
        entity_id: this._stateObj!.entity_id,
      }
    );
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsHumidifierToggleCardFeature(this.hass, this.context)
    ) {
      return null;
    }

    const color = stateColor(this, this._stateObj);

    const options = ["off", "on"].map<ControlSelectOption>((entityState) => ({
      value: entityState,
      label: this.hass!.formatEntityState(this._stateObj!, entityState),
      path: entityState === "on" ? mdiWaterPercent : mdiPower,
    }));

    return html`
      <ha-control-select
        .options=${options}
        .value=${this._currentState}
        @value-changed=${this._valueChanged}
        hide-option-label
        .label=${this.hass.localize("ui.card.humidifier.state")}
        style=${styleMap({
          "--control-select-color": color,
        })}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
      >
      </ha-control-select>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-humidifier-toggle-card-feature": HuiHumidifierToggleCardFeature;
  }
}
