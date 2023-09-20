import { mdiTuneVariant } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-select-menu";
import type { HaControlSelectMenu } from "../../../components/ha-control-select-menu";
import {
  ClimateEntity,
  ClimateEntityFeature,
  computePresetModeIcon,
} from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { ClimatePresetModesTileFeatureConfig } from "./types";

export const supportsClimatePresetModesTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "climate" &&
    supportsFeature(stateObj, ClimateEntityFeature.PRESET_MODE)
  );
};

@customElement("hui-climate-preset-modes-tile-feature")
class HuiClimatePresetModeTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ClimateEntity;

  @state() private _config?: ClimatePresetModesTileFeatureConfig;

  @state() _currentPresetMode?: string;

  @query("ha-control-select-menu", true)
  private _haSelect!: HaControlSelectMenu;

  static getStubConfig(): ClimatePresetModesTileFeatureConfig {
    return {
      type: "climate-preset-modes",
    };
  }

  public setConfig(config: ClimatePresetModesTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentPresetMode = this.stateObj.attributes.preset_mode;
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (
        this.hass &&
        this.hass.formatEntityAttributeValue !==
          oldHass?.formatEntityAttributeValue
      ) {
        this._haSelect.layoutOptions();
      }
    }
  }

  private async _valueChanged(ev: CustomEvent) {
    const presetMode = (ev.target as any).value as string;

    const oldPresetMode = this.stateObj!.attributes.preset_mode;

    if (presetMode === oldPresetMode) return;

    this._currentPresetMode = presetMode;

    try {
      await this._setMode(presetMode);
    } catch (err) {
      this._currentPresetMode = oldPresetMode;
    }
  }

  private async _setMode(mode: string) {
    await this.hass!.callService("climate", "set_preset_mode", {
      entity_id: this.stateObj!.entity_id,
      preset_mode: mode,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsClimatePresetModesTileFeature(this.stateObj)
    ) {
      return null;
    }

    const stateObj = this.stateObj;

    return html`
      <div class="container">
        <ha-control-select-menu
          show-arrow
          hide-label
          .label=${this.hass!.formatEntityAttributeName(
            stateObj,
            "preset_mode"
          )}
          .value=${stateObj.attributes.preset_mode}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._valueChanged}
          @closed=${stopPropagation}
        >
          <ha-svg-icon slot="icon" .path=${mdiTuneVariant}></ha-svg-icon>
          ${stateObj.attributes.preset_modes?.map(
            (mode) => html`
              <ha-list-item .value=${mode} graphic="icon">
                <ha-svg-icon
                  slot="graphic"
                  .path=${computePresetModeIcon(mode)}
                ></ha-svg-icon>
                ${this.hass!.formatEntityAttributeValue(
                  stateObj,
                  "preset_mode",
                  mode
                )}
              </ha-list-item>
            `
          )}
        </ha-control-select-menu>
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-control-select-menu {
        box-sizing: border-box;
        --control-select-menu-height: 40px;
        --control-select-menu-border-radius: 10px;
        line-height: 1.2;
        display: block;
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
    "hui-climate-modes-preset-modes-feature": HuiClimatePresetModeTileFeature;
  }
}
