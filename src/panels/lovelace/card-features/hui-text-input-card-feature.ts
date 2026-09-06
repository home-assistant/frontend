import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/input/ha-input";
import { apiContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  TextInputCardFeatureConfig,
} from "./types";

const supportsTextInputCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "input_text" || domain === "text";
};

export const supportsTextInputCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsTextInputCardFeatureFromState(stateObj);
};

@customElement("hui-text-input-card-feature")
class HuiTextInputCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _config?: TextInputCardFeatureConfig;

  @state() private _localValue?: string;

  static getStubConfig(): TextInputCardFeatureConfig {
    return {
      type: "text-input",
    };
  }

  public setConfig(config: TextInputCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("_stateObj") && this._stateObj) {
      this._localValue = this._stateObj.state;
    }
  }
  @state() private _invalid = false;
  private _valueChanged(ev: CustomEvent) {
    this._localValue = (ev.target as any).value ?? "";
    this._invalid = false;
  }

  private async _valueCommitted(ev: CustomEvent) {
    const stateObj = this._stateObj!;
    const value = (ev.target as any).value ?? "";
    const { min, max, pattern } = stateObj.attributes;

    const isValid =
      (min === undefined || value.length >= min) &&
      (max === undefined || value.length <= max) &&
      (!pattern || new RegExp(pattern).test(value));

    if (!isValid) {
      this._localValue = stateObj.state;
      this._invalid = true;
      return;
    }

    const domain = computeDomain(stateObj.entity_id);
    await this._api.callService(domain, "set_value", {
      entity_id: stateObj.entity_id,
      value,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsTextInputCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }
    const stateObj = this._stateObj;
    const isPassword = stateObj.attributes.mode === "password";

    return html`
      <ha-input
        appearance="outlined"
        .type=${isPassword ? "password" : "text"}
        .passwordToggle=${isPassword}
        .value=${this._localValue ?? ""}
        .minlength=${stateObj.attributes.min}
        .maxlength=${stateObj.attributes.max}
        .pattern=${stateObj.attributes.pattern}
        .disabled=${stateObj.state === UNAVAILABLE}
        .invalid=${this._invalid}
        @input=${this._valueChanged}
        @change=${this._valueCommitted}
      ></ha-input>
    `;
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        ha-input {
          width: 100%;
          padding: 0;
        }
        ha-input::part(wa-base) {
          min-height: var(--feature-height);
          border-radius: var(--feature-border-radius);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-text-input-card-feature": HuiTextInputCardFeature;
  }
}
