import { mdiArrowBottomLeft, mdiArrowTopRight, mdiStop } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import {
  canCloseTilt,
  canOpenTilt,
  canStopTilt,
  CoverEntityFeature,
} from "../../../data/cover";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { CoverTiltTileFeatureConfig } from "./types";

export const supportsCoverTiltTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "cover" &&
    (supportsFeature(stateObj, CoverEntityFeature.OPEN_TILT) ||
      supportsFeature(stateObj, CoverEntityFeature.CLOSE_TILT))
  );
};

@customElement("hui-cover-tilt-tile-feature")
class HuiCoverTiltTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: CoverTiltTileFeatureConfig;

  static getStubConfig(): CoverTiltTileFeatureConfig {
    return {
      type: "cover-tilt",
    };
  }

  public setConfig(config: CoverTiltTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "open_cover_tilt", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "close_cover_tilt", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "stop_cover_tilt", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsCoverTiltTileFeature
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        ${supportsFeature(this.stateObj, CoverEntityFeature.OPEN_TILT)
          ? html`
              <ha-control-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.open_tilt_cover"
                )}
                @click=${this._onOpenTap}
                .disabled=${!canOpenTilt(this.stateObj)}
              >
                <ha-svg-icon .path=${mdiArrowTopRight}></ha-svg-icon>
              </ha-control-button>
            `
          : nothing}
        ${supportsFeature(this.stateObj, CoverEntityFeature.STOP_TILT)
          ? html`
              <ha-control-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.stop_cover"
                )}
                @click=${this._onStopTap}
                .disabled=${!canStopTilt(this.stateObj)}
              >
                <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
              </ha-control-button>
            `
          : nothing}
        ${supportsFeature(this.stateObj, CoverEntityFeature.CLOSE_TILT)
          ? html`
              <ha-control-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.close_tilt_cover"
                )}
                @click=${this._onCloseTap}
                .disabled=${!canCloseTilt(this.stateObj)}
              >
                <ha-svg-icon .path=${mdiArrowBottomLeft}></ha-svg-icon>
              </ha-control-button>
            `
          : nothing}
      </ha-control-button-group>
    `;
  }

  static get styles() {
    return css`
      ha-control-button-group {
        margin: 0 12px 12px 12px;
        --control-button-group-spacing: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-tilt-tile-feature": HuiCoverTiltTileFeature;
  }
}
