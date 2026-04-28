import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { filterModes } from "./common/filter-modes";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

type AttributeModeChangeEvent = CustomEvent<{
  value?: string;
  item?: { value: string };
}>;

type AttributeModeCardFeatureConfig = LovelaceCardFeatureConfig & {
  style?: "dropdown" | "icons";
};

export interface HuiModeSelectOption {
  value: string;
  label: string;
}

export abstract class HuiModeSelectCardFeatureBase<
  TEntity extends HassEntity,
  TConfig extends AttributeModeCardFeatureConfig,
>
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() protected _config?: TConfig;

  @state() protected _currentValue?: string;

  protected abstract readonly _attribute: string;

  protected abstract readonly _modesAttribute: string;

  protected get _configuredModes(): string[] | undefined {
    return undefined;
  }

  protected readonly _dropdownIconPath?: string;

  protected abstract readonly _serviceDomain: string;

  protected abstract readonly _serviceAction: string;

  protected abstract _isSupported(): boolean;

  protected get _label(): string {
    return this.hass!.formatEntityAttributeName(
      this._stateObj!,
      this._attribute
    );
  }

  protected readonly _hideLabel: boolean = true;

  protected readonly _showDropdownOptionIcons: boolean = true;

  protected readonly _allowIconsStyle: boolean = true;

  protected readonly _defaultStyle: "dropdown" | "icons" = "dropdown";

  protected get _controlSelectStyle():
    | Record<string, string | undefined>
    | undefined {
    return undefined;
  }

  protected _getServiceDomain(_stateObj: TEntity): string {
    return this._serviceDomain;
  }

  protected _isValueValid(_value: string, _stateObj: TEntity): boolean {
    return true;
  }

  protected get _stateObj(): TEntity | undefined {
    if (!this.hass || !this.context?.entity_id) {
      return undefined;
    }

    return this.hass.states[this.context.entity_id] as TEntity | undefined;
  }

  public setConfig(config: TConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }

    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    if (
      (changedProps.has("hass") || changedProps.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      const oldStateObj = this.context?.entity_id
        ? (oldHass?.states[this.context.entity_id] as TEntity | undefined)
        : undefined;

      if (oldStateObj !== this._stateObj) {
        this._currentValue = this._getValue(this._stateObj);
      }
    }
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !this._isSupported()
    ) {
      return null;
    }

    const stateObj = this._stateObj;
    const options = this._getOptions();
    const label = this._label;
    const renderIcons =
      this._allowIconsStyle &&
      (this._config.style === "icons" ||
        (this._config.style === undefined && this._defaultStyle === "icons"));

    if (renderIcons) {
      return html`
        <ha-control-select
          .options=${options.map((option) => ({
            ...option,
            icon: this._renderOptionIcon(option),
          }))}
          .value=${this._currentValue}
          @value-changed=${this._valueChanged}
          hide-option-label
          .label=${label}
          style=${styleMap(this._controlSelectStyle ?? {})}
          .disabled=${stateObj.state === UNAVAILABLE}
        >
        </ha-control-select>
      `;
    }

    return html`
      <ha-control-select-menu
        show-arrow
        ?hide-label=${this._hideLabel}
        .label=${label}
        .value=${this._currentValue}
        .disabled=${stateObj.state === UNAVAILABLE}
        @wa-select=${this._valueChanged}
        .options=${options}
        .renderIcon=${this._showDropdownOptionIcons
          ? this._renderMenuIcon
          : undefined}
      >
        ${this._dropdownIconPath
          ? html`<ha-svg-icon
              slot="icon"
              .path=${this._dropdownIconPath}
            ></ha-svg-icon>`
          : nothing}
      </ha-control-select-menu>
    `;
  }

  protected _getValue(stateObj: TEntity): string | undefined {
    return stateObj.attributes[this._attribute] as string | undefined;
  }

  protected _getOptions(): HuiModeSelectOption[] {
    if (!this._stateObj || !this.hass) {
      return [];
    }

    return filterModes(
      this._stateObj.attributes[this._modesAttribute] as string[] | undefined,
      this._configuredModes
    ).map((mode) => ({
      value: mode,
      label: this.hass!.formatEntityAttributeValue(
        this._stateObj!,
        this._attribute,
        mode
      ),
    }));
  }

  protected _renderOptionIcon(option: HuiModeSelectOption): TemplateResult<1> {
    return html`<ha-attribute-icon
      slot="graphic"
      .hass=${this.hass!}
      .stateObj=${this._stateObj}
      .attribute=${this._attribute}
      .attributeValue=${option.value}
    ></ha-attribute-icon>`;
  }

  private _renderMenuIcon = (value: string): TemplateResult<1> =>
    html`<ha-attribute-icon
      .hass=${this.hass!}
      .stateObj=${this._stateObj}
      .attribute=${this._attribute}
      .attributeValue=${value}
    ></ha-attribute-icon>`;

  private async _valueChanged(ev: AttributeModeChangeEvent) {
    if (!this.hass || !this._stateObj) {
      return;
    }

    const value = ev.detail.value ?? ev.detail.item?.value;
    const oldValue = this._getValue(this._stateObj);

    if (
      value === oldValue ||
      !value ||
      !this._isValueValid(value, this._stateObj)
    ) {
      return;
    }

    this._currentValue = value;

    try {
      await this.hass.callService(
        this._getServiceDomain(this._stateObj),
        this._serviceAction,
        {
          entity_id: this._stateObj.entity_id,
          [this._attribute]: value,
        }
      );
    } catch (_err) {
      this._currentValue = oldValue;
    }
  }

  static get styles() {
    return cardFeatureStyles;
  }
}
