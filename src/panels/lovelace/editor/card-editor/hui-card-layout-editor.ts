import type { ActionDetail } from "@material/mwc-list";
import { mdiCheck, mdiDotsVertical, mdiRestore } from "@mdi/js";
import { LitElement, PropertyValues, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefault } from "../../../../common/dom/prevent_default";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/ha-button";
import "../../../../components/ha-button-menu";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-slider";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { HuiCard } from "../../cards/hui-card";
import { LovelaceLayoutOptions } from "../../types";
import "./ha-grid-size-editor";

@customElement("hui-card-layout-editor")
export class HuiCardVisibilityEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: LovelaceCardConfig;

  @state() _defaultLayoutOptions?: LovelaceLayoutOptions;

  @state() public _yamlMode = false;

  @state() public _uiAvailable = true;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  private _cardElement?: HuiCard;

  private _gridSizeValue = memoizeOne(
    (
      options?: LovelaceLayoutOptions,
      defaultOptions?: LovelaceLayoutOptions
    ) => ({
      rows: options?.grid_rows ?? defaultOptions?.grid_rows,
      columns: options?.grid_columns ?? defaultOptions?.grid_columns,
    })
  );

  render() {
    return html`
      <div class="header">
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

          <li divider role="separator"></li>

          <ha-list-item graphic="icon">
            Reset to default
            <ha-svg-icon slot="graphic" .path=${mdiRestore}></ha-svg-icon>
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
            <ha-grid-size-editor
              .hass=${this.hass}
              .value=${this._gridSizeValue(
                this.config.layout_options,
                this._defaultLayoutOptions
              )}
              @value-changed=${this._gridSizeChanged}
            ></ha-grid-size-editor>
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
    const value = ev.detail.value;

    const newConfig: LovelaceCardConfig = {
      ...this.config,
      layout_options: {
        ...this.config.layout_options,
        grid_columns: value.columns,
        grid_rows: value.rows,
      },
    };

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

  static styles = [
    haStyle,
    css`
      ha-button-menu {
        --mdc-theme-text-primary-on-background: var(--primary-text-color);
      }

      .header {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
      }
      .selected_menu_item {
        color: var(--primary-color);
      }
      .disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      ha-grid-size-editor {
        display: block;
        max-width: 250px;
        margin: 0 auto;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-layout-editor": HuiCardVisibilityEditor;
  }
}
