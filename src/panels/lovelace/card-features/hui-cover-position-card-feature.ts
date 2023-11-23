import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import { computeAttributeNameDisplay } from "../../../common/entity/compute_attribute_display";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { CoverEntityFeature } from "../../../data/cover";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature } from "../types";
import { CoverPositionCardFeatureConfig } from "./types";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../data/entity_attributes";

export const supportsCoverPositionCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "cover" &&
    supportsFeature(stateObj, CoverEntityFeature.SET_POSITION)
  );
};

@customElement("hui-cover-position-card-feature")
class HuiCoverPositionCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ attribute: false }) public color?: string;

  @state() private _config?: CoverPositionCardFeatureConfig;

  static getStubConfig(): CoverPositionCardFeatureConfig {
    return {
      type: "cover-position",
    };
  }

  public setConfig(config: CoverPositionCardFeatureConfig): void {
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
      !supportsCoverPositionCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    const percentage = stateActive(this.stateObj)
      ? this.stateObj.attributes.current_position ?? 0
      : 0;

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
          step="1"
          inverted
          show-handle
          @value-changed=${this._valueChanged}
          .ariaLabel=${computeAttributeNameDisplay(
            this.hass.localize,
            this.stateObj,
            this.hass.entities,
            "current_position"
          )}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
          .unit=${DOMAIN_ATTRIBUTES_UNITS.cover.current_position}
          .locale=${this.hass.locale}
        ></ha-control-slider>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass!.callService("cover", "set_cover_position", {
      entity_id: this.stateObj!.entity_id,
      position: value,
    });
  }

  static get styles() {
    return css`
      ha-control-slider {
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-position-card-feature": HuiCoverPositionCardFeature;
  }
}
