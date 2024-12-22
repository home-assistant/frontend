import { mdiArrowOscillating } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import type { HaControlSelectMenu } from "../../../components/ha-control-select-menu";
import { ClimateEntity, ClimateEntityFeature } from "../../../data/climate";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { ClimateSwingModesCardFeatureConfig } from "./types";
import { filterModes } from "./common/filter-modes";

export const supportsClimateSwingModesCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "climate" &&
    supportsFeature(stateObj, ClimateEntityFeature.SWING_MODE)
  );
};

@customElement("hui-climate-swing-modes-card-feature")
class HuiClimateSwingModesCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: ClimateEntity;

  @state() private _config?: ClimateSwingModesCardFeatureConfig;

  @state() _currentSwingMode?: string;

  @query("ha-control-select-menu", true)
  private _haSelect?: HaControlSelectMenu;

  static getStubConfig(): ClimateSwingModesCardFeatureConfig {
    return {
      type: "climate-swing-modes",
      style: "dropdown",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-climate-swing-modes-card-feature-editor"
    );
    return document.createElement(
      "hui-climate-swing-modes-card-feature-editor"
    );
  }

  public setConfig(config: ClimateSwingModesCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentSwingMode = this.stateObj.attributes.swing_mode;
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
    const swingMode =
      (ev.detail as any).value ?? ((ev.target as any).value as string);

    const oldSwingMode = this.stateObj!.attributes.swing_mode;

    if (swingMode === oldSwingMode) return;

    this._currentSwingMode = swingMode;

    try {
      await this._setMode(swingMode);
    } catch (err) {
      this._currentSwingMode = oldSwingMode;
    }
  }

  private async _setMode(mode: string) {
    await this.hass!.callService("climate", "set_swing_mode", {
      entity_id: this.stateObj!.entity_id,
      swing_mode: mode,
    });
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsClimateSwingModesCardFeature(this.stateObj)
    ) {
      return null;
    }

    const stateObj = this.stateObj;

    const options = filterModes(
      stateObj.attributes.swing_modes,
      this._config!.swing_modes
    ).map<ControlSelectOption>((mode) => ({
      value: mode,
      label: this.hass!.formatEntityAttributeValue(
        this.stateObj!,
        "swing_mode",
        mode
      ),
      icon: html`<ha-attribute-icon
        slot="graphic"
        .hass=${this.hass}
        .stateObj=${stateObj}
        attribute="swing_mode"
        .attributeValue=${mode}
      ></ha-attribute-icon>`,
    }));

    if (this._config.style === "icons") {
      return html`
        <div class="container">
          <ha-control-select
            .options=${options}
            .value=${this._currentSwingMode}
            @value-changed=${this._valueChanged}
            hide-label
            .ariaLabel=${this.hass!.formatEntityAttributeName(
              stateObj,
              "swing_mode"
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
          .label=${this.hass!.formatEntityAttributeName(stateObj, "swing_mode")}
          .value=${this._currentSwingMode}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._valueChanged}
          @closed=${stopPropagation}
        >
          ${this._currentSwingMode
            ? html`<ha-attribute-icon
                slot="icon"
                .hass=${this.hass}
                .stateObj=${stateObj}
                attribute="swing_mode"
                .attributeValue=${this._currentSwingMode}
              ></ha-attribute-icon>`
            : html` <ha-svg-icon
                slot="icon"
                .path=${mdiArrowOscillating}
              ></ha-svg-icon>`}
          ${options.map(
            (option) => html`
              <ha-list-item .value=${option.value} graphic="icon">
                ${option.icon}${option.label}
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
        --control-select-color: var(--feature-color);
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
    "hui-climate-swing-modes-card-feature": HuiClimateSwingModesCardFeature;
  }
}
