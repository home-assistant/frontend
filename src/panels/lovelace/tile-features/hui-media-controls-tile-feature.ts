import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature, LovelaceTileFeatureEditor } from "../types";
import { MediaControlsTileFeatureConfig } from "./types";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-svg-icon";
import {
  computeMediaControls,
  handleMediaControlClick,
  MediaPlayerEntity,
} from "../../../data/media-player";

export const REPEAT_MODES = ["off", "all", "one"] as const;

export const supportsMediaControlsTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "media_player";
};

@customElement("hui-media-controls-tile-feature")
class HuiMediaControlsTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: MediaPlayerEntity;

  @state() private _config?: MediaControlsTileFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(): MediaControlsTileFeatureConfig {
    return {
      type: "media-controls",
      use_extended_controls: false,
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileFeatureEditor> {
    await import(
      "../editor/config-elements/hui-media-controls-tile-feature-editor"
    );
    return document.createElement("hui-media-controls-tile-feature-editor");
  }

  public setConfig(config: MediaControlsTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentState = this.stateObj.state;
    }
  }

  private _handleClick(e: MouseEvent): void {
    handleMediaControlClick(
      this.hass!,
      this.stateObj!,
      (e.currentTarget as HTMLElement).getAttribute("action")!
    );
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsMediaControlsTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const stateObj = this.stateObj;

    const mediaControls = computeMediaControls(
      stateObj,
      this._config.use_extended_controls
    );
    if (!mediaControls) {
      return nothing;
    }

    return html`
      <div class="container">
        <ha-control-button-group>
          ${mediaControls.map(
            (control) => html`
              <ha-control-button
                action=${control.action}
                @click=${this._handleClick}
                title=${this.hass!.localize(
                  `ui.card.media_player.${control.action}`
                )}
              >
                <ha-svg-icon .path=${control.icon}></ha-svg-icon>
              </ha-control-button>
            `
          )}
        </ha-control-button-group>
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-control-button {
        --control-button-background-color: var(--tile-color);
        width: 100%;
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
    "hui-media-controls-tile-feature": HuiMediaControlsTileFeature;
  }
}
