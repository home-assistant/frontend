import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeAttributeNameDisplay } from "../../../common/entity/compute_attribute_display";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-slider";
import {
  apiContext,
  entitiesContext,
  formattersContext,
  internationalizationContext,
} from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../data/entity/entity_attributes";
import type { FanEntity, FanSpeed } from "../../../data/fan";
import {
  computeFanSpeedCount,
  computeFanSpeedIcon,
  FAN_SPEED_COUNT_MAX_FOR_BUTTONS,
  FAN_SPEEDS,
  FanEntityFeature,
  fanPercentageToSpeed,
  fanSpeedToPercentage,
} from "../../../data/fan";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  FanSpeedCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsFanSpeedCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "fan" && supportsFeature(stateObj, FanEntityFeature.SET_SPEED)
  );
};

export const supportsFanSpeedCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsFanSpeedCardFeatureFromState(stateObj);
};

@customElement("hui-fan-speed-card-feature")
class HuiFanSpeedCardFeature extends LitElement implements LovelaceCardFeature {
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

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: HomeAssistant["entities"];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state() private _config?: FanSpeedCardFeatureConfig;

  static getStubConfig(): FanSpeedCardFeatureConfig {
    return {
      type: "fan-speed",
    };
  }

  public setConfig(config: FanSpeedCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _localizeSpeed(speed: FanSpeed) {
    if (speed === "on" || speed === "off") {
      return this._formatters.formatEntityState(this._stateObj!, speed);
    }
    return this._localize(`ui.card.fan.speed.${speed}`) || speed;
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsFanSpeedCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const speedCount = computeFanSpeedCount(this._stateObj);

    const percentage = stateActive(this._stateObj)
      ? (this._stateObj.attributes.percentage ?? 0)
      : 0;

    if (speedCount <= FAN_SPEED_COUNT_MAX_FOR_BUTTONS) {
      const options = FAN_SPEEDS[speedCount]!.map<ControlSelectOption>(
        (speed) => ({
          value: speed,
          label: this._localizeSpeed(speed),
          path: computeFanSpeedIcon(this._stateObj!, speed),
        })
      );

      const speed = fanPercentageToSpeed(this._stateObj, percentage);

      return html`
        <ha-control-select
          .options=${options}
          .value=${speed}
          @value-changed=${this._speedValueChanged}
          hide-option-label
          .label=${computeAttributeNameDisplay(
            this._localize,
            this._stateObj,
            this._entities,
            "percentage"
          )}
          .disabled=${this._stateObj!.state === UNAVAILABLE}
        >
        </ha-control-select>
      `;
    }

    const value = Math.max(Math.round(percentage), 0);

    return html`
      <ha-control-slider
        .value=${value}
        min="0"
        max="100"
        .step=${this._stateObj.attributes.percentage_step ?? 1}
        @value-changed=${this._valueChanged}
        .label=${computeAttributeNameDisplay(
          this._localize,
          this._stateObj,
          this._entities,
          "percentage"
        )}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
        .unit=${DOMAIN_ATTRIBUTES_UNITS.fan.percentage}
        .locale=${this._locale}
      ></ha-control-slider>
    `;
  }

  private _speedValueChanged(ev: HASSDomEvent<HASSDomEvents["value-changed"]>) {
    const speed = ev.detail.value as FanSpeed;

    const percentage = fanSpeedToPercentage(this._stateObj!, speed);

    this._api.callService("fan", "set_percentage", {
      entity_id: this._stateObj!.entity_id,
      percentage: percentage,
    });
  }

  private _valueChanged(ev: HASSDomEvent<HASSDomEvents["value-changed"]>) {
    const { value } = ev.detail;
    if (typeof value !== "number" || isNaN(value)) return;

    this._api.callService("fan", "set_percentage", {
      entity_id: this._stateObj!.entity_id,
      percentage: value,
    });
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        ha-control-select {
          /* Color the background to match the slider style */
          --control-select-background: var(--feature-color);
          --control-select-background-opacity: 0.2;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-fan-speed-card-feature": HuiFanSpeedCardFeature;
  }
}
