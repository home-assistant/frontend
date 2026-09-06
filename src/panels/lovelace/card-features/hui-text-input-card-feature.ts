import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomTargetEvent } from "../../../common/dom/fire_event";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/input/ha-input";
import type { HaInput } from "../../../components/input/ha-input";
import { apiContext, formattersContext } from "../../../data/context";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity/entity";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantFormatters,
} from "../../../types";
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

export const isTextInputValueValid = (
  value: string,
  stateObj: Pick<HassEntity, "attributes">
): boolean => {
  const { min, max } = stateObj.attributes;
  const length = [...value].length;

  if (typeof min === "number" && length < min) return false;
  if (typeof max === "number" && length > max) return false;

  return true;
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

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

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

  private _valueChanged(ev: HASSDomTargetEvent<HaInput>) {
    this._localValue = ev.target.value ?? "";
  }

  private async _valueCommitted(ev: HASSDomTargetEvent<HaInput>) {
    const stateObj = this._stateObj!;
    const target = ev.target;
    const value = target.value ?? "";
    const isReserved = value === UNAVAILABLE || value === UNKNOWN;

    if (isReserved || !isTextInputValueValid(value, stateObj)) {
      target.reportValidity();
      target.value = stateObj.state;
      this._localValue = stateObj.state;
      return;
    }

    if (value === stateObj.state) {
      return;
    }

    const domain = computeDomain(stateObj.entity_id);

    try {
      await this._api.callService(domain, "set_value", {
        entity_id: stateObj.entity_id,
        value,
      });
    } catch {
      if (
        this._stateObj?.entity_id === stateObj.entity_id &&
        this._localValue === value
      ) {
        this._localValue = this._stateObj.state;
      }
    }
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
        aria-label=${this._formatters.formatEntityName(stateObj, undefined)}
        .type=${isPassword ? "password" : "text"}
        .passwordToggle=${isPassword}
        .value=${this._localValue ?? ""}
        .disabled=${stateObj.state === UNAVAILABLE}
        .minlength=${stateObj.attributes.min}
        .maxlength=${stateObj.attributes.max}
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
