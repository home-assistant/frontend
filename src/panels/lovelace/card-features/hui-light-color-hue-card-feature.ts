import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { hs2rgb, rgb2hex } from "../../../common/color/convert-color";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-slider";
import { apiContext, internationalizationContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import {
  lightIsInColorMode,
  lightSupportsColor,
  type LightEntity,
} from "../../../data/light";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantInternationalization,
  ValueChangedEvent,
} from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LightColorHueCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

// Below this the light looks white, so a hue change would not be visible.
const MIN_SATURATION = 10;

const supportsLightColorHueCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "light" && lightSupportsColor(stateObj);
};

export const supportsLightColorHueCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsLightColorHueCardFeatureFromState(stateObj);
};

// A light already showing a color keeps its saturation so the slider only
// moves the hue. White and color temperature lights get a fully saturated one.
export const computeLightHueSaturation = (stateObj: LightEntity) => {
  const saturation = stateObj.attributes.hs_color?.[1];
  return lightIsInColorMode(stateObj) &&
    saturation != null &&
    saturation >= MIN_SATURATION
    ? saturation
    : 100;
};

const hsToHex = (hs: [number, number]) => rgb2hex(hs2rgb([hs[0], hs[1] / 100]));

@customElement("hui-light-color-hue-card-feature")
class HuiLightColorHueCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: LightEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state() private _config?: LightColorHueCardFeatureConfig;

  // Hue picked on the slider, shown until the light reports its new color.
  @state() private _hue?: number;

  static getStubConfig(): LightColorHueCardFeatureConfig {
    return {
      type: "light-color-hue",
    };
  }

  public setConfig(config: LightColorHueCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("_stateObj")) {
      this._hue = undefined;
    }
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsLightColorHueCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const hs: [number, number] | undefined =
      this._hue != null
        ? [this._hue, computeLightHueSaturation(this._stateObj)]
        : this._stateObj.attributes.hs_color;

    return html`
      <ha-control-slider
        .value=${hs?.[0]}
        mode="cursor"
        .disabled=${this._stateObj.state === UNAVAILABLE}
        @slider-moved=${this._sliderMoved}
        @value-changed=${this._valueChanged}
        .label=${this._localize("ui.card.light.hue")}
        min="0"
        max="360"
        unit="°"
        style=${styleMap({
          "--control-slider-cursor-indicator-color": hs
            ? hsToHex(hs)
            : undefined,
        })}
        .locale=${this._locale}
      ></ha-control-slider>
    `;
  }

  private _sliderMoved(ev: HASSDomEvent<HASSDomEvents["slider-moved"]>) {
    this._hue = ev.detail.value;
  }

  private _valueChanged(ev: ValueChangedEvent<number>) {
    ev.stopPropagation();
    const hue = ev.detail.value;
    this._hue = hue;

    this._api.callService("light", "turn_on", {
      entity_id: this._stateObj!.entity_id,
      hs_color: [hue, computeLightHueSaturation(this._stateObj!)],
    });
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        ha-control-slider {
          /* Hue is linear in RGB between these six colors. */
          --hue-stops: #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00;
          --control-slider-background: linear-gradient(
            to right,
            var(--hue-stops)
          );
          --control-slider-background-opacity: 1;
        }
        :host(:dir(rtl)) ha-control-slider {
          --control-slider-background: linear-gradient(
            to left,
            var(--hue-stops)
          );
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-color-hue-card-feature": HuiLightColorHueCardFeature;
  }
}
