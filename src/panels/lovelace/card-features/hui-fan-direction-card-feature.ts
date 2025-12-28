import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import { UNAVAILABLE } from "../../../data/entity";
import type { FanEntity, FanDirection } from "../../../data/fan";
import { FanEntityFeature } from "../../../data/fan";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  FanDirectionCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsFanDirectionCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "fan" && supportsFeature(stateObj, FanEntityFeature.DIRECTION)
  );
};

@customElement("hui-fan-direction-card-feature")
class HuiFanDirectionCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: FanDirectionCardFeatureConfig;

  @state() _currentDirection?: FanDirection;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as FanEntity | undefined;
  }

  static getStubConfig(): FanDirectionCardFeatureConfig {
    return {
      type: "fan-direction",
    };
  }

  public setConfig(config: FanDirectionCardFeatureConfig): void {
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
        this._currentDirection = this._stateObj.attributes
          .direction as FanDirection;
      }
    }
  }

  private async _valueChanged(ev: CustomEvent) {
    const newDirection = (ev.detail as any).value as FanDirection;

    if (newDirection === this._stateObj!.attributes.direction) return;

    const oldDirection = this._stateObj!.attributes.direction as FanDirection;
    this._currentDirection = newDirection;

    try {
      await this._setDirection(newDirection);
    } catch (_err) {
      this._currentDirection = oldDirection;
    }
  }

  private async _setDirection(direction: string) {
    await this.hass!.callService("fan", "set_direction", {
      entity_id: this._stateObj!.entity_id,
      direction: direction,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsFanDirectionCardFeature(this.hass, this.context)
    ) {
      return null;
    }

    const stateObj = this._stateObj;
    const FAN_DIRECTION_MAP: FanDirection[] = ["forward", "reverse"];

    const options = FAN_DIRECTION_MAP.map<ControlSelectOption>((direction) => ({
      value: direction,
      label: this.hass!.localize(`ui.card.fan.${direction}`),
      icon: html`<ha-attribute-icon
        slot="graphic"
        .hass=${this.hass}
        .stateObj=${stateObj}
        attribute="direction"
        .attributeValue=${direction}
      ></ha-attribute-icon>`,
    }));

    return html`
      <ha-control-select
        .options=${options}
        .value=${this._currentDirection}
        @value-changed=${this._valueChanged}
        hide-option-label
        .label=${this.hass!.formatEntityAttributeName(stateObj, "direction")}
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
    "hui-fan-direction-card-feature": HuiFanDirectionCardFeature;
  }
}
