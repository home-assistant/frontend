import { mdiArrowOscillating, mdiArrowOscillatingOff } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import { UNAVAILABLE } from "../../../data/entity";
import type { FanEntity } from "../../../data/fan";
import { FanEntityFeature } from "../../../data/fan";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  FanOscillateCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";
import { supportsFeature } from "../../../common/entity/supports-feature";

export const supportsFanOscilatteCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "fan" && supportsFeature(stateObj, FanEntityFeature.OSCILLATE)
  );
};

@customElement("hui-fan-oscillate-card-feature")
class HuiFanOscillateCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: FanOscillateCardFeatureConfig;

  @state() _oscillate?: boolean;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as FanEntity | undefined;
  }

  static getStubConfig(): FanOscillateCardFeatureConfig {
    return {
      type: "fan-oscillate",
    };
  }

  public setConfig(config: FanOscillateCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    if (
      (changedProp.has("hass") || changedProp.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context!.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._oscillate = this._stateObj.attributes.oscillating;
      }
    }
  }

  private async _valueChanged(ev: CustomEvent) {
    const shouldOscillate = (ev.detail as any).value === "yes";

    if (shouldOscillate === this._stateObj!.attributes.oscillating) return;

    const wasOscillating = this._stateObj!.attributes.oscillating;
    this._oscillate = shouldOscillate;

    try {
      await this._updateOscillate(shouldOscillate);
    } catch (_err) {
      this._oscillate = wasOscillating;
    }
  }

  private async _updateOscillate(oscillate: boolean) {
    await this.hass!.callService("fan", "oscillate", {
      entity_id: this._stateObj!.entity_id,
      oscillating: oscillate,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsFanOscilatteCardFeature(this.hass, this.context)
    ) {
      return null;
    }

    const color = stateColorCss(this._stateObj);

    const yesNo = ["no", "yes"] as const;
    const options = yesNo.map<ControlSelectOption>((oscillating) => ({
      value: oscillating,
      label: this.hass!.localize(`ui.common.${oscillating}`),
      path:
        oscillating === "yes" ? mdiArrowOscillating : mdiArrowOscillatingOff,
    }));

    return html`
      <ha-control-select
        .options=${options}
        .value=${this._oscillate ? "yes" : "no"}
        @value-changed=${this._valueChanged}
        hide-option-label
        .label=${this.hass.localize("ui.card.fan.oscillate")}
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
    "hui-fan-oscillate-card-feature": HuiFanOscillateCardFeature;
  }
}
