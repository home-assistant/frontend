import { mdiTuneVariant } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import type { HaControlSelectMenu } from "../../../components/ha-control-select-menu";
import {
  ClimateEntity,
  ClimateEntityFeature,
  computePresetModeIcon,
} from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature, LovelaceTileFeatureEditor } from "../types";
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
  private _haSelect?: HaControlSelectMenu;

  static getStubConfig(
    _,
    stateObj?: HassEntity
  ): ClimatePresetModesTileFeatureConfig {
    return {
      type: "climate-preset-modes",
      style: "dropdown",
      preset_modes: stateObj?.attributes.preset_modes || [],
    };
  }

  public static async getConfigElement(): Promise<LovelaceTileFeatureEditor> {
    await import(
      "../editor/config-elements/hui-climate-preset-modes-tile-feature-editor"
    );
    return document.createElement(
      "hui-climate-preset-modes-tile-feature-editor"
    );
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
    if (this._haSelect && changedProps.has("hass")) {
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
    const presetMode =
      (ev.detail as any).value ?? ((ev.target as any).value as string);

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

    const modes = stateObj.attributes.preset_modes || [];

    const options = modes
      .filter((mode) => (this._config!.preset_modes || []).includes(mode))
      .map<ControlSelectOption>((mode) => ({
        value: mode,
        label: this.hass!.formatEntityAttributeValue(
          this.stateObj!,
          "preset_mode",
          mode
        ),
        path: computePresetModeIcon(mode),
      }));

    if (this._config.style === "icons") {
      return html`
        <div class="container">
          <ha-control-select
            .options=${options}
            .value=${this._currentPresetMode}
            @value-changed=${this._valueChanged}
            hide-label
            .ariaLabel=${this.hass!.formatEntityAttributeName(
              stateObj,
              "preset_mode"
            )}
            .disabled=${this.stateObj!.state === UNAVAILABLE}
          >
          </ha-control-select>
        </div>
      `;
    }

    return html`
      <div class="container">
        <ha-control-select-menu
          show-arrow
          hide-label
          .label=${this.hass!.formatEntityAttributeName(
            stateObj,
            "preset_mode"
          )}
          .value=${this._currentPresetMode}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._valueChanged}
          @closed=${stopPropagation}
        >
          <ha-svg-icon slot="icon" .path=${mdiTuneVariant}></ha-svg-icon>
          ${options.map(
            (option) => html`
              <ha-list-item .value=${option.value} graphic="icon">
                <ha-svg-icon slot="graphic" .path=${option.path}></ha-svg-icon>
                ${option.label}
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
      ha-control-select {
        --control-select-color: var(--tile-color);
        --control-select-padding: 0;
        --control-select-thickness: 40px;
        --control-select-border-radius: 10px;
        --control-select-button-border-radius: 10px;
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
