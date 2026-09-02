import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-attribute-icon";
import "../../../components/ha-control-select";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-svg-icon";
import { apiContext, formattersContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HomeAssistantApi, HomeAssistantFormatters } from "../../../types";
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
  style?: "dropdown" | "icons" | "buttons";
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
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  protected _stateObj?: TEntity;

  @state()
  @consumeLocalize()
  protected _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  protected _api!: HomeAssistantApi;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  protected _formatters!: HomeAssistantFormatters;

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
    return this._formatters.formatEntityAttributeName(
      this._stateObj!,
      this._attribute
    );
  }

  protected readonly _hideLabel: boolean = true;

  protected readonly _showDropdownOptionIcons: boolean = true;

  protected readonly _allowIconsStyle: boolean = true;

  protected readonly _allowButtonsStyle: boolean = false;

  protected readonly _defaultStyle: "dropdown" | "icons" | "buttons" =
    "dropdown";

  protected get _controlSelectStyle():
    Record<string, string | undefined> | undefined {
    return undefined;
  }

  protected _getServiceDomain(_stateObj: TEntity): string {
    return this._serviceDomain;
  }

  protected _isValueValid(_value: string, _stateObj: TEntity): boolean {
    return true;
  }

  public setConfig(config: TConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }

    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (changedProps.has("_stateObj") && this._stateObj) {
      this._currentValue = this._getValue(this._stateObj);
    }
  }

  protected render(): TemplateResult | null {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !this._isSupported()
    ) {
      return null;
    }

    const stateObj = this._stateObj;
    const options = this._getOptions();
    const label = this._label;
    const style = this._config.style ?? this._defaultStyle;
    const renderIcons = this._allowIconsStyle && style === "icons";
    const renderButtons = this._allowButtonsStyle && style === "buttons";

    if (renderIcons || renderButtons) {
      return html`
        <ha-control-select
          .options=${options.map((option) =>
            renderIcons
              ? { ...option, icon: this._renderOptionIcon(option) }
              : option
          )}
          .value=${this._currentValue}
          @value-changed=${this._valueChanged}
          ?hide-option-label=${renderIcons}
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
        .renderIcon=${
          this._showDropdownOptionIcons ? this._renderMenuIcon : undefined
        }
      >
        ${
          this._dropdownIconPath
            ? html`<ha-svg-icon
                slot="icon"
                .path=${this._dropdownIconPath}
              ></ha-svg-icon>`
            : nothing
        }
      </ha-control-select-menu>
    `;
  }

  protected _getValue(stateObj: TEntity): string | undefined {
    return stateObj.attributes[this._attribute] as string | undefined;
  }

  protected _getOptions(): HuiModeSelectOption[] {
    if (!this._stateObj) {
      return [];
    }

    return filterModes(
      this._stateObj.attributes[this._modesAttribute] as string[] | undefined,
      this._configuredModes
    ).map((mode) => ({
      value: mode,
      label: this._formatters.formatEntityAttributeValue(
        this._stateObj!,
        this._attribute,
        mode
      ),
    }));
  }

  protected _renderOptionIcon(option: HuiModeSelectOption): TemplateResult<1> {
    return html`<ha-attribute-icon
      slot="graphic"
      .stateObj=${this._stateObj}
      .attribute=${this._attribute}
      .attributeValue=${option.value}
    ></ha-attribute-icon>`;
  }

  private _renderMenuIcon = (value: string): TemplateResult<1> =>
    html`<ha-attribute-icon
      .stateObj=${this._stateObj}
      .attribute=${this._attribute}
      .attributeValue=${value}
    ></ha-attribute-icon>`;

  private async _valueChanged(ev: AttributeModeChangeEvent) {
    if (!this._stateObj) {
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
      await this._api.callService(
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
