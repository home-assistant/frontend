import type { ActionDetail } from "@material/mwc-list";
import { mdiCheck, mdiDotsVertical } from "@mdi/js";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
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
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { HuiCard } from "../../cards/hui-card";
import {
  CardGridSize,
  computeCardGridSize,
} from "../../common/compute-card-grid-size";
import { LovelaceLayoutOptions } from "../../types";

@customElement("hui-card-layout-editor")
export class HuiCardLayoutEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceCardConfig;

  @property({ attribute: false }) public sectionConfig!: LovelaceSectionConfig;

  @state() _defaultLayoutOptions?: LovelaceLayoutOptions;

  @state() public _yamlMode = false;

  @state() public _uiAvailable = true;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  private _cardElement?: HuiCard;

  private _mergedOptions = memoizeOne(
    (
      options?: LovelaceLayoutOptions,
      defaultOptions?: LovelaceLayoutOptions
    ) => ({
      ...defaultOptions,
      ...options,
    })
  );

  private _computeCardGridSize = memoizeOne(computeCardGridSize);

  private _isDefault = memoizeOne(
    (options?: LovelaceLayoutOptions) =>
      options?.grid_columns === undefined && options?.grid_rows === undefined
  );

  render() {
    const options = this._mergedOptions(
      this.config.layout_options,
      this._defaultLayoutOptions
    );

    const value = this._computeCardGridSize(options);

    const totalColumns = (this.sectionConfig.column_span ?? 1) * 4;

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
              .defaultValue=${this.config.layout_options}
              @value-changed=${this._valueChanged}
            ></ha-yaml-editor>
          `
        : html`
            <ha-grid-size-picker
              style=${styleMap({
                "max-width": `${totalColumns * 45 + 50}px`,
              })}
              .columns=${totalColumns}
              .hass=${this.hass}
              .value=${value}
              .isDefault=${this._isDefault(this.config.layout_options)}
              @value-changed=${this._gridSizeChanged}
              .rowMin=${options.grid_min_rows}
              .rowMax=${options.grid_max_rows}
              .columnMin=${options.grid_min_columns}
              .columnMax=${options.grid_max_columns}
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
                .checked=${value.columns === "full"}
                name="full-width"
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
        this._defaultLayoutOptions =
          this._cardElement?.getElementLayoutOptions();
      });
      this._cardElement.load();
      this._defaultLayoutOptions = this._cardElement.getElementLayoutOptions();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
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

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = false;
        break;
      case 1:
        this._yamlMode = true;
        break;
      case 2:
        this._reset();
        break;
    }
  }

  private async _reset() {
    const newConfig = { ...this.config };
    delete newConfig.layout_options;
    this._yamlEditor?.setValue({});
    fireEvent(this, "value-changed", { value: newConfig });
  }

  private _gridSizeChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value as CardGridSize;

    const newConfig: LovelaceCardConfig = {
      ...this.config,
      layout_options: {
        ...this.config.layout_options,
        grid_columns: value.columns,
        grid_rows: value.rows,
      },
    };

    if (newConfig.layout_options!.grid_columns === undefined) {
      delete newConfig.layout_options!.grid_columns;
    }
    if (newConfig.layout_options!.grid_rows === undefined) {
      delete newConfig.layout_options!.grid_rows;
    }
    if (Object.keys(newConfig.layout_options!).length === 0) {
      delete newConfig.layout_options;
    }

    fireEvent(this, "value-changed", { value: newConfig });
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const options = ev.detail.value as LovelaceLayoutOptions;
    const newConfig: LovelaceCardConfig = {
      ...this.config,
      layout_options: options,
    };
    fireEvent(this, "value-changed", { value: newConfig });
  }

  private _fullWidthChanged(ev): void {
    ev.stopPropagation();
    const value = ev.target.checked;
    const newConfig: LovelaceCardConfig = {
      ...this.config,
      layout_options: {
        ...this.config.layout_options,
        grid_columns: value
          ? "full"
          : (this._defaultLayoutOptions?.grid_min_columns ?? 1),
      },
    };
    fireEvent(this, "value-changed", { value: newConfig });
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
