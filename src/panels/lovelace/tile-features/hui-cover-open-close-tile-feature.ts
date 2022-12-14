import { mdiStop } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  computeCloseIcon,
  computeOpenIcon,
} from "../../../common/entity/cover_icon";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/tile/ha-tile-button";
import {
  canClose,
  canOpen,
  canStop,
  CoverEntityFeature,
} from "../../../data/cover";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { CoverOpenCloseTileFeatureConfig } from "./types";

@customElement("hui-cover-open-close-tile-feature")
class HuiCoverOpenCloseTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: CoverOpenCloseTileFeatureConfig;

  static getStubConfig(): CoverOpenCloseTileFeatureConfig {
    return {
      type: "cover-open-close",
    };
  }

  public setConfig(config: CoverOpenCloseTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _onOpenTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "open_cover", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onCloseTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "close_cover", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  private _onStopTap(ev): void {
    ev.stopPropagation();
    this.hass!.callService("cover", "stop_cover", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <div class="container">
        ${supportsFeature(this.stateObj, CoverEntityFeature.OPEN)
          ? html`
              <ha-tile-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.open_cover"
                )}
                @click=${this._onOpenTap}
                .disabled=${!canOpen(this.stateObj)}
              >
                <ha-svg-icon
                  .path=${computeOpenIcon(this.stateObj)}
                ></ha-svg-icon>
              </ha-tile-button>
            `
          : null}
        ${supportsFeature(this.stateObj, CoverEntityFeature.STOP)
          ? html`
              <ha-tile-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.stop_cover"
                )}
                @click=${this._onStopTap}
                .disabled=${!canStop(this.stateObj)}
              >
                <ha-svg-icon .path=${mdiStop}></ha-svg-icon>
              </ha-tile-button>
            `
          : null}
        ${supportsFeature(this.stateObj, CoverEntityFeature.CLOSE)
          ? html`
              <ha-tile-button
                .label=${this.hass.localize(
                  "ui.dialogs.more_info_control.cover.close_cover"
                )}
                @click=${this._onCloseTap}
                .disabled=${!canClose(this.stateObj)}
              >
                <ha-svg-icon
                  .path=${computeCloseIcon(this.stateObj)}
                ></ha-svg-icon>
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
    "hui-cover-open-close-tile-feature": HuiCoverOpenCloseTileFeature;
  }
}
