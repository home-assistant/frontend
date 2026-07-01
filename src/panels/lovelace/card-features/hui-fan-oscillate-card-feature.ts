import { consume } from "@lit/context";
import { mdiArrowOscillating, mdiArrowOscillatingOff } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { stateColorCss } from "../../../common/entity/state_color";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import { apiContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { FanEntity } from "../../../data/fan";
import { FanEntityFeature } from "../../../data/fan";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  FanOscillateCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsFanOscilatteCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "fan" && supportsFeature(stateObj, FanEntityFeature.OSCILLATE)
  );
};

export const supportsFanOscilatteCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsFanOscilatteCardFeatureFromState(stateObj);
};

@customElement("hui-fan-oscillate-card-feature")
class HuiFanOscillateCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: FanEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _config?: FanOscillateCardFeatureConfig;

  @state() _oscillate?: boolean;

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
    if (changedProp.has("_stateObj") && this._stateObj) {
      this._oscillate = this._stateObj.attributes.oscillating;
    }
  }

  private async _valueChanged(
    ev: HASSDomEvent<HASSDomEvents["value-changed"]>
  ) {
    const shouldOscillate = ev.detail.value === "yes";

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
    await this._api.callService("fan", "oscillate", {
      entity_id: this._stateObj!.entity_id,
      oscillating: oscillate,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsFanOscilatteCardFeatureFromState(this._stateObj)
    ) {
      return null;
    }

    const color = stateColorCss(this._stateObj);

    const yesNo = ["no", "yes"] as const;
    const options = yesNo.map<ControlSelectOption>((oscillating) => ({
      value: oscillating,
      label: this._localize(`ui.common.${oscillating}`),
      path:
        oscillating === "yes" ? mdiArrowOscillating : mdiArrowOscillatingOff,
    }));

    return html`
      <ha-control-select
        .options=${options}
        .value=${this._oscillate ? "yes" : "no"}
        @value-changed=${this._valueChanged}
        hide-option-label
        .label=${this._localize("ui.card.fan.oscillate")}
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
