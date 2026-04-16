import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  SelectDropdownCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportSelectDropdownCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return ["select", "input_select"].includes(domain);
};

@customElement("hui-input-select-card-feature")
class HuiSelectDropdownCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: SelectDropdownCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as HassEntity | undefined;
  }

  static getStubConfig(): SelectDropdownCardFeatureConfig {
    return {
      type: "select-dropdown",
    };
  }

  public setConfig(config: SelectDropdownCardFeatureConfig): void {
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
      !supportSelectDropdownCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const options = this._stateObj.attributes.options ?? [];

    return html`
      <ha-control-select-menu
        .value=${this._stateObj.state}
        .options=${options}
        .disabled=${this._stateObj.state === "unavailable"}
        @value-changed=${this._valueChanged}
      >
      </ha-control-select-menu>
    `;
  }

  static styles = cardFeatureStyles;

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;

    if (!value) return;

    if (!this.hass || !this._stateObj) return;

    const domain = computeDomain(this._stateObj.entity_id);

    this.hass.callService(domain, "select_option", {
      entity_id: this._stateObj!.entity_id,
      option: value,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-select-dropdown-card-feature": HuiSelectDropdownCardFeature;
  }
}
