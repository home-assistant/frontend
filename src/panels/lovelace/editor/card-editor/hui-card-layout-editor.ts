import type { ActionDetail } from "@material/mwc-list";
import { mdiCheck, mdiDotsVertical } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefault } from "../../../../common/dom/prevent_default";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-grid-size-picker";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-settings-row";
import "../../../../components/ha-slider";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-switch";
import "../../../../components/ha-yaml-editor";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { HuiCard } from "../../cards/hui-card";
import type { CardGridSize } from "../../common/compute-card-grid-size";
import {
  computeCardGridSize,
  divideBy,
  GRID_COLUMN_MULTIPLIER,
  migrateLayoutToGridOptions,
  multiplyBy,
} from "../../common/compute-card-grid-size";
import type { LovelaceGridOptions } from "../../types";

const computePreciseMode = (columns?: number | string) =>
  typeof columns === "number" && columns % 3 !== 0;

@customElement("hui-card-layout-editor")
export class HuiCardLayoutEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceCardConfig;

  @property({ attribute: false }) public sectionConfig!: LovelaceSectionConfig;

  @state() private _defaultGridOptions?: LovelaceGridOptions;

  @state() private _yamlMode = false;

  @state() private _uiAvailable = true;

  @state() private _preciseMode = false;

  private _cardElement?: HuiCard;

  private _mergedOptions = memoizeOne(
    (options?: LovelaceGridOptions, defaultOptions?: LovelaceGridOptions) => ({
      ...defaultOptions,
      ...options,
    })
  );

  private _computeCardGridSize = memoizeOne(computeCardGridSize);

  private _simplifyOptions = (
    options: LovelaceGridOptions
  ): LovelaceGridOptions => ({
    ...options,
    columns: divideBy(options.columns, GRID_COLUMN_MULTIPLIER),
    max_columns: divideBy(options.max_columns, GRID_COLUMN_MULTIPLIER),
    min_columns: divideBy(options.min_columns, GRID_COLUMN_MULTIPLIER),
  });

  private _standardizeOptions = (options: LovelaceGridOptions) => ({
    ...options,
    columns: multiplyBy(options.columns, GRID_COLUMN_MULTIPLIER),
    max_columns: multiplyBy(options.max_columns, GRID_COLUMN_MULTIPLIER),
    min_columns: multiplyBy(options.min_columns, GRID_COLUMN_MULTIPLIER),
  });

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

    const gridOptions = this._preciseMode
      ? options
      : this._simplifyOptions(options);
    const gridValue = this._computeCardGridSize(gridOptions);

    const columnSpan = this.sectionConfig.column_span ?? 1;
    const gridTotalColumns =
      (12 * columnSpan) / (this._preciseMode ? 1 : GRID_COLUMN_MULTIPLIER);

    return html`
      <div class="header">
        <p class="intro">
          ${this.hass.localize(
            "ui.panel.lovelace.editor.edit_card.layout.explanation"
          )}
        </p>
        <ha-button-menu
          slot="icons"
          @action=${this._handleAction}
          @click=${preventDefault}
          @closed=${stopPropagation}
          fixed
          .corner=${"BOTTOM_END"}
          .menuCorner=${"END"}
        >
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          >
          </ha-icon-button>

          <ha-list-item graphic="icon" .disabled=${!this._uiAvailable}>
            ${this.hass.localize("ui.panel.lovelace.editor.edit_card.edit_ui")}
            ${!this._yamlMode
              ? html`
                  <ha-svg-icon
                    class="selected_menu_item"
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>
                `
              : nothing}
          </ha-list-item>

          <ha-list-item graphic="icon">
            ${this.hass.localize(
              "ui.panel.lovelace.editor.edit_card.edit_yaml"
            )}
            ${this._yamlMode
              ? html`
                  <ha-svg-icon
                    class="selected_menu_item"
                    slot="graphic"
                    .path=${mdiCheck}
                  ></ha-svg-icon>
                `
              : nothing}
          </ha-list-item>
        </ha-button-menu>
      </div>
      ${this._yamlMode
        ? html`
            <ha-yaml-editor
              .hass=${this.hass}
              .defaultValue=${configOptions}
              @value-changed=${this._yamlChanged}
            ></ha-yaml-editor>
          `
        : html`
            <ha-grid-size-picker
              style=${styleMap({
                "max-width": `${(this.sectionConfig.column_span ?? 1) * 200 + 50}px`,
              })}
              .columns=${gridTotalColumns}
              .hass=${this.hass}
              .value=${gridValue}
              .isDefault=${this._isDefault(configOptions)}
              @value-changed=${this._gridSizeChanged}
              .rowMin=${gridOptions.min_rows}
              .rowMax=${gridOptions.max_rows}
              .columnMin=${gridOptions.min_columns}
              .columnMax=${gridOptions.max_columns}
            ></ha-grid-size-picker>
            <ha-settings-row>
              <span slot="heading" data-for="full-width">
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_card.layout.full_width"
                )}
              </span>
              <span slot="description" data-for="full-width">
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_card.layout.full_width_helper"
                )}
              </span>
              <ha-switch
                @change=${this._fullWidthChanged}
                .checked=${options.columns === "full"}
                name="full-width"
              >
              </ha-switch>
            </ha-settings-row>
            <ha-settings-row>
              <span slot="heading" data-for="precise-mode">
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_card.layout.precise_mode"
                )}
              </span>
              <span slot="description" data-for="precise-mode">
                ${this.hass.localize(
                  "ui.panel.lovelace.editor.edit_card.layout.precise_mode_helper"
                )}
              </span>
              <ha-switch
                @change=${this._preciseModeChanged}
                .checked=${this._preciseMode}
                name="precise-mode"
              >
              </ha-switch>
            </ha-settings-row>
          `}
    `;
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
      const columns = this.config.grid_options?.columns;
      const preciseMode = computePreciseMode(columns);
      // Force precise mode if columns count is not a multiple of 3
      if (!this._preciseMode && preciseMode) {
        this._preciseMode = preciseMode;
      }
      // Reset precise mode when grid options config is reset
      if (columns === undefined) {
        const defaultColumns = this._defaultGridOptions?.columns;
        this._preciseMode = computePreciseMode(defaultColumns);
      }
    }
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = false;
        break;
      case 1:
        this._yamlMode = true;
        break;
    }
  }

  private _gridSizeChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value as CardGridSize;

    const gridOptions = {
      columns: value.columns,
      rows: value.rows,
    };

    const newOptions = this._preciseMode
      ? gridOptions
      : this._standardizeOptions(gridOptions);

    this._updateGridOptions({
      ...this.config.grid_options,
      ...newOptions,
    });
  }

  private _yamlChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const options = ev.detail.value as LovelaceGridOptions;
    this._updateGridOptions(options);
  }

  private _fullWidthChanged(ev): void {
    ev.stopPropagation();
    const value = ev.target.checked;
    this._updateGridOptions({
      ...this.config.grid_options,
      columns: value ? "full" : (this._defaultGridOptions?.min_columns ?? 1),
    });
  }

  private _preciseModeChanged(ev): void {
    ev.stopPropagation();
    this._preciseMode = ev.target.checked;
    if (this._preciseMode) return;

    const newOptions = this._standardizeOptions(
      this._simplifyOptions(this.config.grid_options ?? {})
    );
    if (newOptions.columns !== this.config.grid_options?.columns) {
      this._updateGridOptions({
        ...this.config.grid_options,
        columns: newOptions.columns,
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
      .header {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
      }
      .header .intro {
        flex: 1;
        margin: 0;
        color: var(--secondary-text-color);
      }
      .header ha-button-menu {
        --mdc-theme-text-primary-on-background: var(--primary-text-color);
        margin-top: -8px;
      }
      .selected_menu_item {
        color: var(--primary-color);
      }
      .disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      ha-grid-size-picker {
        display: block;
        margin: 16px auto;
        direction: ltr;
      }
      ha-yaml-editor {
        display: block;
        margin: 16px 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-layout-editor": HuiCardLayoutEditor;
  }
}
