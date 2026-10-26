import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import type { HASSDomCurrentTargetEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { conditionalClamp } from "../../../../common/number/clamp";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import { GRID_SIZE_PICKER_ROWS } from "../../../../components/ha-grid-size-picker";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/item/ha-row-item";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import {
  DEFAULT_SECTION_COLUMN_SPAN,
  type LovelaceSectionConfig,
} from "../../../../data/lovelace/config/section";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { HuiCard } from "../../cards/hui-card";
import type { CardGridSize } from "../../common/compute-card-grid-size";
import {
  cardSizeToGridRows,
  computeCardGridSize,
  DEFAULT_GRID_SIZE,
  GRID_COLUMN_MULTIPLIER,
  isPreciseMode,
  migrateLayoutToGridOptions,
} from "../../common/compute-card-grid-size";
import type { LovelaceGridOptions } from "../../types";

@customElement("hui-card-layout-editor")
export class HuiCardLayoutEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceCardConfig;

  @property({ attribute: false }) public sectionConfig!: LovelaceSectionConfig;

  @state() private _defaultGridOptions?: LovelaceGridOptions;

  @state() private _customSize = false;

  @state() private _contentRows?: number;

  @state() private _preciseMode = false;

  private _cardElement?: HuiCard;

  private _mergedOptions = memoizeOne(
    (options?: LovelaceGridOptions, defaultOptions?: LovelaceGridOptions) => ({
      ...DEFAULT_GRID_SIZE,
      ...defaultOptions,
      ...options,
    })
  );

  private _computeCardGridSize = memoizeOne(computeCardGridSize);

  private _recommendedSize = memoizeOne(
    (options: LovelaceGridOptions, defaultOptions?: LovelaceGridOptions) => {
      const limits = { ...options };
      delete limits.columns;
      delete limits.rows;
      return computeCardGridSize({
        ...DEFAULT_GRID_SIZE,
        ...defaultOptions,
        ...limits,
      });
    }
  );

  private _isDefault = memoizeOne(
    (options?: LovelaceGridOptions) =>
      options?.columns === undefined && options?.rows === undefined
  );

  private _configGridOptions = (config: LovelaceCardConfig) => {
    if (config.grid_options) {
      return config.grid_options;
    }
    if (config.layout_options) {
      return migrateLayoutToGridOptions(config.layout_options);
    }
    return {};
  };

  render() {
    const configOptions = this._configGridOptions(this.config);
    const options = this._mergedOptions(
      configOptions,
      this._defaultGridOptions
    );

    const gridOptions = options;
    const gridValue = this._computeCardGridSize(gridOptions);
    const recommended = this._recommendedSize(
      configOptions,
      this._defaultGridOptions
    );

    const columnSpan =
      this.sectionConfig.column_span ?? DEFAULT_SECTION_COLUMN_SPAN;
    const gridTotalColumns = 12 * columnSpan;

    return html`
      ${
        this._defaultGridOptions &&
        Object.keys(this._defaultGridOptions).length === 0
          ? html`
              <ha-alert alert-type="info">
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_card.layout.no_grid_support"
                )}
              </ha-alert>
            `
          : nothing
      }
      <ha-row-item>
        <span slot="headline"
          >${this.hass.localize(
            "ui.panel.lovelace.editor.edit_card.layout.recommended_size"
          )}</span
        >
        <span slot="supporting-text">${this._sizeText(recommended)}</span>
        <ha-switch
          slot="end"
          @change=${this._recommendedSizeChanged}
          .checked=${!this._customSize}
          name="recommended-size"
        ></ha-switch>
      </ha-row-item>
      ${
        this._customSize
          ? html`
              <ha-grid-size-picker
                style=${styleMap({
                  "max-width": `${(this.sectionConfig.column_span ?? DEFAULT_SECTION_COLUMN_SPAN) * 250 + 40}px`,
                })}
                .columns=${gridTotalColumns}
                .value=${gridValue}
                .autoRows=${this._contentRows}
                .precise=${this._preciseMode}
                @value-changed=${this._gridSizeChanged}
                @precise-mode-changed=${this._preciseModeChanged}
                .rowMin=${gridOptions.min_rows}
                .rowMax=${gridOptions.max_rows}
                .columnMin=${gridOptions.min_columns}
                .columnMax=${gridOptions.max_columns}
                .step=${this._preciseMode ? 1 : GRID_COLUMN_MULTIPLIER}
              ></ha-grid-size-picker>
              <ha-row-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.lovelace.editor.edit_card.layout.fit_content"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this.hass.localize(
                    "ui.panel.lovelace.editor.edit_card.layout.fit_content_helper"
                  )}</span
                >
                <ha-switch
                  slot="end"
                  @change=${this._autoHeightChanged}
                  .checked=${options.rows === "auto"}
                  name="auto-height"
                ></ha-switch>
              </ha-row-item>
              <ha-row-item>
                <span slot="headline"
                  >${this.hass.localize(
                    "ui.panel.lovelace.editor.edit_card.layout.full_width"
                  )}</span
                >
                <span slot="supporting-text"
                  >${this.hass.localize(
                    "ui.panel.lovelace.editor.edit_card.layout.full_width_helper"
                  )}</span
                >
                <ha-switch
                  slot="end"
                  @change=${this._fullWidthChanged}
                  .checked=${options.columns === "full"}
                  name="full-width"
                ></ha-switch>
              </ha-row-item>
            `
          : nothing
      }
    `;
  }

  private _widthText(columns: CardGridSize["columns"]): string {
    if (columns === "full") {
      return this.hass.localize("ui.components.grid-size-picker.full_width");
    }
    return this.hass.localize("ui.components.grid-size-picker.columns_value", {
      count: columns,
    });
  }

  private _heightText(rows: CardGridSize["rows"]): string {
    if (rows === "auto") {
      return this.hass.localize("ui.components.grid-size-picker.fit_content");
    }
    return this.hass.localize("ui.components.grid-size-picker.rows_value", {
      count: rows,
    });
  }

  private _sizeText(size: CardGridSize): string {
    return this.hass.localize(
      "ui.panel.lovelace.editor.edit_card.layout.size",
      {
        width: this._widthText(size.columns),
        height: this._heightText(size.rows),
      }
    );
  }

  protected firstUpdated(changedProps: PropertyValues<this>): void {
    super.firstUpdated(changedProps);
    try {
      this._cardElement = document.createElement("hui-card");
      this._cardElement.hass = this.hass;
      this._cardElement.preview = true;
      this._cardElement.config = this.config;
      this._cardElement.addEventListener("card-updated", (ev: Event) => {
        ev.stopPropagation();
        this._updateDefaultGridOptions();
      });
      this._cardElement.load();
      this._updateDefaultGridOptions();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  private _updateDefaultGridOptions() {
    if (!this._cardElement) {
      this._defaultGridOptions = undefined;
      return;
    }
    this._defaultGridOptions = this._cardElement.getElementGridOptions();
    this._updateContentRows(this._cardElement);
  }

  private async _updateContentRows(cardElement: HuiCard) {
    const config = this.config;
    const cardSize = await cardElement.getCardSize();
    if (config !== this.config) {
      return;
    }
    this._contentRows = Math.min(
      cardSizeToGridRows(cardSize),
      GRID_SIZE_PICKER_ROWS
    );
  }

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);
    if (this._cardElement) {
      if (changedProps.has("hass")) {
        this._cardElement.hass = this.hass;
      }
      if (changedProps.has("config")) {
        this._cardElement.config = this.config;
      }
    }
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("config")) {
      if (!this._isDefault(this._configGridOptions(this.config))) {
        this._customSize = true;
      }

      const options = this.config.grid_options;

      // Reset precise mode when grid options config is reset
      if (!options) {
        this._preciseMode = this._defaultGridOptions
          ? isPreciseMode(this._defaultGridOptions)
          : false;
        return;
      }

      // Force precise mode if columns count is not a multiple of 3
      const preciseMode = isPreciseMode(options);
      if (!this._preciseMode && preciseMode) {
        this._preciseMode = preciseMode;
      }
    }
  }

  private _recommendedSizeChanged(
    ev: HASSDomCurrentTargetEvent<HaSwitch>
  ): void {
    ev.stopPropagation();
    this._customSize = !ev.currentTarget.checked;
    if (this._customSize) {
      return;
    }
    this._updateGridOptions({
      ...this.config.grid_options,
      columns: undefined,
      rows: undefined,
    });
  }

  private _gridSizeChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value as Partial<CardGridSize>;

    this._updateGridOptions({
      ...this._configGridOptions(this.config),
      ...value,
    });
  }

  private _fullWidthChanged(ev): void {
    ev.stopPropagation();
    const checked = ev.target.checked;

    let columns: number | "full";
    const defaultGridOptions = {
      ...DEFAULT_GRID_SIZE,
      ...this._defaultGridOptions,
    };
    if (checked) {
      columns = "full";
    } else if (defaultGridOptions.columns === "full") {
      // Default is full width, so we need to set a specific value
      const columnSpan =
        this.sectionConfig.column_span ?? DEFAULT_SECTION_COLUMN_SPAN;
      const gridTotalColumns = 12 * columnSpan;
      columns = defaultGridOptions.max_columns ?? gridTotalColumns;
    } else {
      columns = defaultGridOptions.columns;
    }

    this._updateGridOptions({
      ...this.config.grid_options,
      columns,
    });
  }

  private _autoHeightChanged(ev): void {
    ev.stopPropagation();
    const checked = ev.target.checked;

    let rows: number | "auto";
    const defaultGridOptions = {
      ...DEFAULT_GRID_SIZE,
      ...this._defaultGridOptions,
    };
    if (checked) {
      rows = "auto";
    } else if (defaultGridOptions.rows === "auto") {
      // Default is auto height, so we need to set a specific value
      rows = conditionalClamp(
        this._contentRows ?? 1,
        defaultGridOptions.min_rows,
        defaultGridOptions.max_rows
      );
    } else {
      rows = defaultGridOptions.rows;
    }

    this._updateGridOptions({
      ...this.config.grid_options,
      rows,
    });
  }

  private _preciseModeChanged(ev): void {
    ev.stopPropagation();
    this._preciseMode = ev.detail.value;
    if (this._preciseMode) return;

    const columns = this.config.grid_options?.columns;

    if (typeof columns === "number" && columns % GRID_COLUMN_MULTIPLIER !== 0) {
      const newColumns =
        Math.ceil(columns / GRID_COLUMN_MULTIPLIER) * GRID_COLUMN_MULTIPLIER;
      this._updateGridOptions({
        ...this.config.grid_options,
        columns: newColumns,
      });
    }
  }

  private _updateGridOptions(options: LovelaceGridOptions): void {
    const value: LovelaceCardConfig = {
      ...this.config,
      grid_options: {
        ...options,
      },
    };
    if (value.grid_options) {
      for (const [k, v] of Object.entries(value.grid_options)) {
        if (v === undefined) {
          delete value.grid_options[k];
        }
      }
      if (Object.keys(value.grid_options).length === 0) {
        delete value.grid_options;
      }
    }
    if (value.layout_options) {
      delete value.layout_options;
    }
    fireEvent(this, "value-changed", { value });
  }

  static styles = [
    haStyle,
    css`
      .disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      ha-row-item::part(supporting-text) {
        white-space: normal;
      }
      ha-grid-size-picker {
        display: block;
        margin: 16px auto;
        direction: ltr;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-layout-editor": HuiCardLayoutEditor;
  }
}
