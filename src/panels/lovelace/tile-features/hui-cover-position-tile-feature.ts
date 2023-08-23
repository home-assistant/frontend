import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { CoverEntityFeature } from "../../../data/cover";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature, LovelaceTileFeatureEditor } from "../types";
import { CoverPositionTileFeatureConfig } from "./types";
import { stateActive } from "../../../common/entity/state_active";
import { computeAttributeNameDisplay } from "../../../common/entity/compute_attribute_display";
import { UNAVAILABLE } from "../../../data/entity";

export const supportsCoverPositionTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "cover" &&
    supportsFeature(stateObj, CoverEntityFeature.SET_POSITION)
  );
};

@customElement("hui-cover-position-tile-feature")
class HuiCoverPositionTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: CoverPositionTileFeatureConfig;

  static getStubConfig(): CoverPositionTileFeatureConfig {
    return {
      type: "cover-position",
      inverted_direction: false,
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileFeatureEditor> {
    await import(
      "../editor/config-elements/hui-cover-position-tile-feature-editor"
    );
    return document.createElement("hui-cover-position-tile-feature-editor");
  }

  public setConfig(config: CoverPositionTileFeatureConfig): void {
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
      !supportsCoverPositionTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const percentage = stateActive(this.stateObj)
      ? this.stateObj.attributes.current_position ?? 0
      : 0;

    const value = Math.max(Math.round(percentage), 0);

    return html` <div class="container">
      <ha-control-slider
        .value=${value}
        min="0"
        max="100"
        step="1"
        .inverted=${!this._config.inverted_direction}
        show-handle
        @value-changed=${this._valueChanged}
        .ariaLabel=${computeAttributeNameDisplay(
          this.hass.localize,
          this.stateObj,
          this.hass.entities,
          "current_position"
        )}
        .disabled=${this.stateObj!.state === UNAVAILABLE}
      ></ha-control-slider>
    </div>`;
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
        /* Force inactive state to be colored for the slider */
        --control-slider-color: var(--tile-color);
        --control-slider-background: var(--tile-color);
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
    "hui-cover-position-tile-feature": HuiCoverPositionTileFeature;
  }
}
