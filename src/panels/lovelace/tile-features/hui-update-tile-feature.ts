import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { updateCanInstall, UpdateEntity } from "../../../data/update";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { UpdateTileFeatureConfig } from "./types";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";

export const supportsUpdateTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "update";
};

@customElement("hui-update-tile-feature")
class HuiUpdateTileFeature extends LitElement implements LovelaceTileFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: UpdateEntity;

  @state() private _config?: UpdateTileFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(): UpdateTileFeatureConfig {
    return {
      type: "update",
    };
  }

  public setConfig(config: UpdateTileFeatureConfig): void {
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

  private async _skip() {
    const stateObj = this.stateObj!;

    this.hass!.callService("update", "skip", {
      entity_id: stateObj.entity_id,
    });
  }

  private async _install() {
    const stateObj = this.stateObj!;

    this.hass!.callService("update", "install", {
      entity_id: stateObj.entity_id,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsUpdateTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const stateObj = this.stateObj;

    return html`
      <div class="container">
        <ha-control-button-group>
          <ha-control-button
            .disabled=${!updateCanInstall(stateObj)}
            @click=${this._skip}
          >
            ${this.hass!.localize("ui.dialogs.more_info_control.update.skip")}
          </ha-control-button>
          <ha-control-button
            .disabled=${!updateCanInstall(stateObj, true)}
            @click=${this._install}
          >
            ${this.hass!.localize(
              "ui.dialogs.more_info_control.update.install"
            )}
          </ha-control-button>
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
    "hui-update-tile-feature": HuiUpdateTileFeature;
  }
}
