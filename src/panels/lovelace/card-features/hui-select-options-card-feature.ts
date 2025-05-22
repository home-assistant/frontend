import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-select-menu";
import type { HaControlSelectMenu } from "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import { UNAVAILABLE } from "../../../data/entity";
import type { InputSelectEntity } from "../../../data/input_select";
import type { SelectEntity } from "../../../data/select";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { filterModes } from "./common/filter-modes";
import type { SelectOptionsCardFeatureConfig } from "./types";

export const supportsSelectOptionsCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "select" || domain === "input_select";
};

@customElement("hui-select-options-card-feature")
class HuiSelectOptionsCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?:
    | SelectEntity
    | InputSelectEntity;

  @state() private _config?: SelectOptionsCardFeatureConfig;

  @state() _currentOption?: string;

  @query("ha-control-select-menu", true)
  private _haSelect!: HaControlSelectMenu;

  static getStubConfig(): SelectOptionsCardFeatureConfig {
    return {
      type: "select-options",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-select-options-card-feature-editor"
    );
    return document.createElement("hui-select-options-card-feature-editor");
  }

  public setConfig(config: SelectOptionsCardFeatureConfig): void {
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

    if (
      option === oldOption ||
      !this.stateObj!.attributes.options.includes(option)
    )
      return;

    this._currentOption = option;

    try {
      await this._setOption(option);
    } catch (_err) {
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
      !supportsSelectOptionsCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    const stateObj = this.stateObj;

    const options = this._getOptions(
      this.stateObj.attributes.options,
      this._config.options
    );

    return html`
      <ha-control-select-menu
        show-arrow
        hide-label
        .label=${this.hass.localize("ui.card.select.option")}
        .value=${stateObj.state}
        .options=${options}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        fixedMenuPosition
        naturalMenuWidth
        @selected=${this._valueChanged}
        @closed=${stopPropagation}
      >
        ${options.map(
          (option) => html`
            <ha-list-item .value=${option}>
              ${this.hass!.formatEntityState(stateObj, option)}
            </ha-list-item>
          `
        )}
      </ha-control-select-menu>
    `;
  }

  private _getOptions = memoizeOne(
    (attributeOptions: string[], configOptions: string[] | undefined) =>
      filterModes(attributeOptions, configOptions)
  );

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-select-options-card-feature": HuiSelectOptionsCardFeature;
  }
}
