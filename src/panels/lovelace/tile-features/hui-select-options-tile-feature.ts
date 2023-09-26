import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-select-menu";
import type { HaControlSelectMenu } from "../../../components/ha-control-select-menu";
import { UNAVAILABLE } from "../../../data/entity";
import { InputSelectEntity } from "../../../data/input_select";
import { SelectEntity } from "../../../data/select";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { SelectOptionsTileFeatureConfig } from "./types";

export const supportsSelectOptionTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "select" || domain === "input_select";
};

@customElement("hui-select-options-tile-feature")
class HuiSelectOptionsTileFeature
  extends LitElement
  implements LovelaceTileFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?:
    | SelectEntity
    | InputSelectEntity;

  @state() private _config?: SelectOptionsTileFeatureConfig;

  @state() _currentOption?: string;

  @query("ha-control-select-menu", true)
  private _haSelect!: HaControlSelectMenu;

  static getStubConfig(): SelectOptionsTileFeatureConfig {
    return {
      type: "select-options",
    };
  }

  public setConfig(config: SelectOptionsTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentOption = this.stateObj.state;
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
    const option = (ev.target as any).value as string;

    const oldOption = this.stateObj!.state;

    if (option === oldOption) return;

    this._currentOption = option;

    try {
      await this._setOption(option);
    } catch (err) {
      this._currentOption = oldOption;
    }
  }

  private async _setOption(option: string) {
    const domain = computeDomain(this.stateObj!.entity_id);
    await this.hass!.callService(domain, "select_option", {
      entity_id: this.stateObj!.entity_id,
      option: option,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsSelectOptionTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const stateObj = this.stateObj;

    return html`
      <div class="container">
        <ha-control-select-menu
          show-arrow
          hide-label
          .label=${this.hass.localize("ui.card.select.option")}
          .value=${stateObj.state}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          fixedMenuPosition
          naturalMenuWidth
          @selected=${this._valueChanged}
          @closed=${stopPropagation}
        >
          ${stateObj.attributes.options!.map(
            (option) => html`
              <ha-list-item .value=${option}>
                ${this.hass!.formatEntityState(stateObj, option)}
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
    "hui-select-options-tile-feature": HuiSelectOptionsTileFeature;
  }
}
