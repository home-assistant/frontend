import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { computeAttributeNameDisplay } from "../../../common/entity/compute_attribute_display";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateColorCss } from "../../../common/entity/state_color";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { CoverEntity, CoverEntityFeature } from "../../../data/cover";
import { UNAVAILABLE } from "../../../data/entity";
import { generateTiltSliderTrackBackgroundGradient } from "../../../dialogs/more-info/components/cover/ha-more-info-cover-tilt-position";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { CoverTiltPositionTileFeatureConfig } from "./types";

const GRADIENT = generateTiltSliderTrackBackgroundGradient();

export const supportsCoverTiltPositionTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "cover" &&
    supportsFeature(stateObj, CoverEntityFeature.SET_TILT_POSITION)
  );
};

@customElement("hui-cover-tilt-position-tile-feature")
class HuiCoverTiltPositionTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: CoverEntity;

  @property({ attribute: false }) public color?: string;

  @state() private _config?: CoverTiltPositionTileFeatureConfig;

  static getStubConfig(): CoverTiltPositionTileFeatureConfig {
    return {
      type: "cover-tilt-position",
    };
  }

  public setConfig(config: CoverTiltPositionTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsCoverTiltPositionTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const percentage = this.stateObj.attributes.current_tilt_position ?? 0;

    const value = Math.max(Math.round(percentage), 0);

    const openColor = stateColorCss(this.stateObj, "open");

    const color = this.color
      ? computeCssColor(this.color)
      : stateColorCss(this.stateObj);

    const style = {
      "--color": color,
      // Use open color for inactive state to avoid grey slider that looks disabled
      "--state-cover-inactive-color": openColor,
    };

    return html`
      <div class="container" style=${styleMap(style)}>
        <ha-control-slider
          .value=${value}
          min="0"
          max="100"
          mode="cursor"
          inverted
          @value-changed=${this._valueChanged}
          .ariaLabel=${computeAttributeNameDisplay(
            this.hass.localize,
            this.stateObj,
            this.hass.entities,
            "current_tilt_position"
          )}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
        >
          <div slot="background" class="gradient"></div
        ></ha-control-slider>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass!.callService("cover", "set_cover_tilt_position", {
      entity_id: this.stateObj!.entity_id,
      tilt_position: value,
    });
  }

  static get styles() {
    return css`
      ha-control-slider {
        /* Force inactive state to be colored for the slider */
        --control-slider-color: var(--color);
        --control-slider-background: var(--color);
        --control-slider-background-opacity: 0.2;
        --control-slider-thickness: 40px;
        --control-slider-border-radius: 10px;
      }
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
      .gradient {
        background: -webkit-linear-gradient(left, ${GRADIENT});
        opacity: 0.6;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-tilt-position-tile-feature": HuiCoverTiltPositionTileFeature;
  }
}
