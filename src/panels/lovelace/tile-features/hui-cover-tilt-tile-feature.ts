import { mdiArrowBottomLeft, mdiArrowTopRight, mdiStop } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/tile/ha-tile-button";
import {
  canCloseTilt,
  canOpenTilt,
  canStopTilt,
  CoverEntityFeature,
} from "../../../data/cover";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { CoverTiltTileFeatureConfig } from "./types";

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

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <div class="container">
        ${supportsFeature(this.stateObj, CoverEntityFeature.OPEN_TILT)
          ? html`
              <ha-tile-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.open_tilt_cover"
                )}
                @click=${this._onOpenTap}
                .disabled=${!canOpenTilt(this.stateObj)}
              >
                <ha-svg-icon .path=${mdiArrowTopRight}></ha-svg-icon>
              </ha-tile-button>
            `
          : null}
        ${supportsFeature(this.stateObj, CoverEntityFeature.STOP_TILT)
          ? html`<ha-tile-button
              .label=${this.hass.localize(
                "ui.dialogs.more_info_control.cover.stop_cover"
              )}
              @click=${this._onStopTap}
              .disabled=${!canStopTilt(this.stateObj)}
            >
              <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
            </ha-tile-button> `
          : null}
        ${supportsFeature(this.stateObj, CoverEntityFeature.CLOSE_TILT)
          ? html`
              <ha-tile-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.close_tilt_cover"
                )}
                @click=${this._onCloseTap}
                .disabled=${!canCloseTilt(this.stateObj)}
              >
                <ha-svg-icon .path=${mdiArrowBottomLeft}></ha-svg-icon>
              </ha-tile-button>
            `
          : undefined}
      </div>
    `;
  }

  static get styles() {
    return css`
      .container {
        display: flex;
        flex-direction: row;
        padding: 0 12px 12px 12px;
        width: auto;
      }
      ha-tile-button {
        flex: 1;
      }
      ha-tile-button:not(:last-child) {
        margin-right: 12px;
        margin-inline-end: 12px;
        margin-inline-start: initial;
        direction: var(--direction);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-tilt-tile-feature": HuiCoverTiltTileFeature;
  }
}
