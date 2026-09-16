import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import "../../../components/ha-control-scrubber";
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
} from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LightColorCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

type ColorAxis = "hue" | "saturation";

const HUE_GRADIENT = Array.from(
  { length: 7 },
  (_, i) => `hsl(${i * 60} 100% 50%)`
).join(", ");

const supportsLightColorCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "light" && lightSupportsColor(stateObj);
};

export const supportsLightColorCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsLightColorCardFeatureFromState(stateObj);
};

@customElement("hui-light-color-card-feature")
class HuiLightColorCardFeature
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

  @state() private _config?: LightColorCardFeatureConfig;

  @state() private _expanded: ColorAxis = "hue";

  static getStubConfig(): LightColorCardFeatureConfig {
    return {
      type: "light-color",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-light-color-card-feature-editor");
    return document.createElement("hui-light-color-card-feature-editor");
  }

  public setConfig(config: LightColorCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsLightColorCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const hsColor = this._stateObj.attributes.hs_color;
    const hue = hsColor?.[0];
    const saturation = hsColor?.[1];

    const saturationGradient = `hsl(${hue ?? 0} 0% 100%), hsl(${hue ?? 0} 100% 50%)`;

    const controls = this._config.controls ?? "hue";
    const showHue = controls !== "saturation";
    const showSaturation = controls !== "hue";
    const single = !(showHue && showSaturation);

    const disabled = this._stateObj.state === UNAVAILABLE;
    const hueLabel = this._localize("ui.card.light.hue");
    const saturationLabel = this._localize("ui.card.light.saturation");

    return html`
      <div class="container">
        ${
          showHue
            ? this._renderAxis({
                axis: "hue",
                expanded: single || this._expanded === "hue",
                gradient: HUE_GRADIENT,
                label: hueLabel,
                disabled,
                onExpand: this._expandHue,
                control: html`
                  <ha-control-scrubber
                    .value=${hue}
                    round-value
                    wrap
                    .disabled=${disabled}
                    @value-changed=${this._hueChanged}
                    .label=${hueLabel}
                    min="0"
                    max="360"
                    unit="°"
                    .locale=${this._locale}
                  ></ha-control-scrubber>
                `,
              })
            : nothing
        }
        ${
          showSaturation
            ? this._renderAxis({
                axis: "saturation",
                expanded: single || this._expanded === "saturation",
                gradient: saturationGradient,
                label: saturationLabel,
                disabled,
                onExpand: this._expandSaturation,
                control: html`
                  <ha-control-slider
                    .value=${saturation}
                    mode="cursor"
                    round-value
                    .showHandle=${stateActive(this._stateObj)}
                    .disabled=${disabled}
                    @value-changed=${this._saturationChanged}
                    .label=${saturationLabel}
                    min="0"
                    max="100"
                    unit="%"
                    .locale=${this._locale}
                  ></ha-control-slider>
                `,
              })
            : nothing
        }
      </div>
    `;
  }

  private _renderAxis(options: {
    axis: ColorAxis;
    expanded: boolean;
    gradient: string;
    label: string;
    disabled: boolean;
    onExpand: (ev: Event) => void;
    control: TemplateResult;
  }) {
    return html`
      <div
        class=${classMap({
          axis: true,
          [options.axis]: true,
          expanded: options.expanded,
        })}
        style=${styleMap({ "--gradient": options.gradient })}
      >
        ${
          options.expanded
            ? options.control
            : html`
                <ha-control-button
                  .label=${options.label}
                  .disabled=${options.disabled}
                  @click=${options.onExpand}
                >
                  <div class="preview"></div>
                </ha-control-button>
              `
        }
      </div>
    `;
  }

  private _expandHue = (ev: Event) => {
    ev.stopPropagation();
    this._expanded = "hue";
  };

  private _expandSaturation = (ev: Event) => {
    ev.stopPropagation();
    this._expanded = "saturation";
  };

  private _hueChanged = (ev: CustomEvent) => {
    ev.stopPropagation();
    const current = this._stateObj!.attributes.hs_color?.[1];
    const visible = current && lightIsInColorMode(this._stateObj!);
    this._setColor([ev.detail.value, visible ? current : 100]);
  };

  private _saturationChanged = (ev: CustomEvent) => {
    ev.stopPropagation();
    const hue = this._stateObj!.attributes.hs_color?.[0] ?? 0;
    this._setColor([hue, ev.detail.value]);
  };

  private _setColor(hsColor: [number, number]) {
    this._api.callService("light", "turn_on", {
      entity_id: this._stateObj!.entity_id,
      hs_color: hsColor,
    });
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        .container {
          display: flex;
          align-items: stretch;
          gap: var(--feature-button-spacing);
          height: var(--feature-height);
        }
        .axis {
          position: relative;
          min-width: 0;
          flex: 0 0 var(--feature-height);
          transition: flex var(--ha-animation-duration-normal) ease-in-out;
        }
        .axis.expanded {
          flex: 1 1 0;
        }
        ha-control-scrubber {
          --control-scrubber-background: linear-gradient(
            to right,
            var(--gradient)
          );
          --control-scrubber-track-width: max(
            100% * 12 / var(--column-size, 12),
            320px
          );
        }
        ha-control-slider {
          --control-slider-background: linear-gradient(
            to right,
            var(--gradient)
          );
          --control-slider-background-opacity: 1;
          --control-slider-inset-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        ha-control-button {
          width: 100%;
          height: 100%;
          --control-button-padding: 0;
        }
        .preview {
          width: 100%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(to right, var(--gradient));
        }
        .saturation .preview {
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        ha-control-button[disabled] .preview {
          opacity: 0.2;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-color-card-feature": HuiLightColorCardFeature;
  }
}
