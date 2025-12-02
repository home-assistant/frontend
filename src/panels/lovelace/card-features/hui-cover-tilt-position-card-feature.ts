import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { computeAttributeNameDisplay } from "../../../common/entity/compute_attribute_display";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { CoverEntity } from "../../../data/cover";
import { CoverEntityFeature } from "../../../data/cover";
import { UNAVAILABLE } from "../../../data/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../data/entity_attributes";
import { generateTiltSliderTrackBackgroundGradient } from "../../../state-control/cover/ha-state-control-cover-tilt-position";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  CoverTiltPositionCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const GRADIENT = generateTiltSliderTrackBackgroundGradient();

export const supportsCoverTiltPositionCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "cover" &&
    supportsFeature(stateObj, CoverEntityFeature.SET_TILT_POSITION)
  );
};

@customElement("hui-cover-tilt-position-card-feature")
class HuiCoverTiltPositionCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state() private _config?: CoverTiltPositionCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as CoverEntity | undefined;
  }

  static getStubConfig(): CoverTiltPositionCardFeatureConfig {
    return {
      type: "cover-tilt-position",
    };
  }

  public setConfig(config: CoverTiltPositionCardFeatureConfig): void {
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
      !supportsCoverTiltPositionCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const percentage = this._stateObj.attributes.current_tilt_position ?? 0;

    const value = Math.max(Math.round(percentage), 0);

    const openColor = stateColorCss(this._stateObj, "open");

    const color = this.color
      ? computeCssColor(this.color)
      : stateColorCss(this._stateObj);

    const style = {
      "--feature-color": color,
      // Use open color for inactive state to avoid grey slider that looks disabled
      "--state-cover-inactive-color": openColor,
    };

    return html`
      <ha-control-slider
        style=${styleMap(style)}
        .value=${value}
        min="0"
        max="100"
        mode="cursor"
        inverted
        @value-changed=${this._valueChanged}
        .label=${computeAttributeNameDisplay(
          this.hass.localize,
          this._stateObj,
          this.hass.entities,
          "current_tilt_position"
        )}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
        .unit=${DOMAIN_ATTRIBUTES_UNITS.cover.current_tilt_position}
        .locale=${this.hass.locale}
      >
        <div slot="background" class="gradient"></div
      ></ha-control-slider>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass!.callService("cover", "set_cover_tilt_position", {
      entity_id: this._stateObj!.entity_id,
      tilt_position: value,
    });
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        .gradient {
          background: -webkit-linear-gradient(left, ${GRADIENT});
          opacity: 0.6;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-tilt-position-card-feature": HuiCoverTiltPositionCardFeature;
  }
}
