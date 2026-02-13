import { mdiPencil, mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import "../../../components/ha-ripple";
import "../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type {
  LovelaceViewConfig,
  LovelaceViewFooterConfig,
} from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { HuiCard } from "../cards/hui-card";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { replaceView } from "../editor/config-util";
import { showEditViewFooterDialog } from "../editor/view-footer/show-edit-view-footer-dialog";
import type { Lovelace } from "../types";
import { DEFAULT_MAX_COLUMNS } from "./hui-sections-view";

@customElement("hui-view-footer")
export class HuiViewFooter extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public card?: HuiCard;

  @property({ attribute: false }) public config?: LovelaceViewFooterConfig;

  @property({ attribute: false }) public viewIndex!: number;

  willUpdate(changedProperties: PropertyValues<typeof this>): void {
    if (changedProperties.has("config")) {
      if (this.config?.card) {
        this.card = this._createCardElement(this.config.card);
      } else {
        this.card = undefined;
      }
      this._checkHidden();
      return;
    }

    if (this.card) {
      if (changedProperties.has("hass")) {
        this.card.hass = this.hass;
      }
      if (changedProperties.has("lovelace")) {
        this.card.preview = this.lovelace.editMode;
      }
    }

    if (changedProperties.has("lovelace") || changedProperties.has("card")) {
      this._checkHidden();
    }
  }

  private _checkHidden() {
    const hidden = !this.card && !this.lovelace?.editMode;
    this.toggleAttribute("hidden", hidden);
  }

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = document.createElement("hui-card");
    element.hass = this.hass;
    element.preview = this.lovelace.editMode;
    element.config = cardConfig;
    element.load();
    return element;
  }

  private _addCard() {
    showCreateCardDialog(this, {
      lovelaceConfig: this.lovelace.config,
      saveConfig: this.lovelace.saveConfig,
      path: [this.viewIndex],
      saveCard: (newCardConfig: LovelaceCardConfig) => {
        this._saveFooterConfig({ ...this.config, card: newCardConfig });
      },
    });
  }

  private _deleteCard(ev) {
    ev.stopPropagation();
    const newConfig = { ...this.config };
    delete newConfig.card;
    this._saveFooterConfig(newConfig);
  }

  private _configure() {
    const viewConfig = this.lovelace.config.views[
      this.viewIndex
    ] as LovelaceViewConfig;

    showEditViewFooterDialog(this, {
      config: this.config || {},
      maxColumns: viewConfig.max_columns || DEFAULT_MAX_COLUMNS,
      saveConfig: (newConfig: LovelaceViewFooterConfig) => {
        this._saveFooterConfig(newConfig);
      },
    });
  }

  private _editCard(ev) {
    ev.stopPropagation();
    const cardConfig = this.config?.card;
    if (!cardConfig) return;

    showEditCardDialog(this, {
      cardConfig,
      lovelaceConfig: this.lovelace.config,
      saveCardConfig: (newCardConfig: LovelaceCardConfig) => {
        this._saveFooterConfig({ ...this.config, card: newCardConfig });
      },
    });
  }

  private _saveFooterConfig(footerConfig: LovelaceViewFooterConfig) {
    const viewConfig = this.lovelace.config.views[
      this.viewIndex
    ] as LovelaceViewConfig;

    const config = { ...viewConfig, footer: footerConfig };

    const updatedConfig = replaceView(
      this.hass,
      this.lovelace.config,
      this.viewIndex,
      config
    );
    this.lovelace.saveConfig(updatedConfig);
  }

  render() {
    if (!this.lovelace) return nothing;

    const editMode = Boolean(this.lovelace?.editMode);
    const card = this.card;

    if (!card && !editMode) return nothing;

    const columnSpan = this.config?.column_span || 1;

    return html`
      <div
        class=${classMap({ wrapper: true, "edit-mode": editMode })}
        style=${styleMap({
          "--footer-column-span": String(columnSpan),
        })}
      >
        ${editMode
          ? html`
              <div class="actions-container">
                <div class="actions">
                  <ha-icon-button
                    .label=${this.hass.localize("ui.common.edit")}
                    @click=${this._configure}
                    .path=${mdiPencil}
                  ></ha-icon-button>
                </div>
              </div>
            `
          : nothing}
        <div class=${classMap({ container: true, "edit-mode": editMode })}>
          ${editMode
            ? card
              ? html`
                  <hui-card-edit-mode
                    @ll-edit-card=${this._editCard}
                    @ll-delete-card=${this._deleteCard}
                    .hass=${this.hass}
                    .lovelace=${this.lovelace!}
                    .path=${[0]}
                    no-duplicate
                    no-move
                  >
                    ${card}
                  </hui-card-edit-mode>
                `
              : html`
                  <button class="add" @click=${this._addCard}>
                    <ha-ripple></ha-ripple>
                    <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.edit_card.add"
                    )}
                  </button>
                `
            : card}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host([hidden]) {
      display: none !important;
    }

    :host {
      position: sticky;
      bottom: 0;
      z-index: 4;
    }

    .wrapper {
      padding: var(--ha-space-4) 0;
      padding-bottom: max(
        var(--ha-space-4),
        var(--safe-area-inset-bottom, 0px)
      );
      box-sizing: content-box;
      margin: 0 auto;
      max-width: calc(
        var(--footer-column-span, 1) * var(--column-max-width, 500px) +
          (var(--footer-column-span, 1) - 1) * var(--column-gap, 32px)
      );
    }

    .wrapper:not(.edit-mode) {
      --ha-card-box-shadow:
        0px 3px 5px -1px rgba(0, 0, 0, 0.2),
        0px 6px 10px 0px rgba(0, 0, 0, 0.14),
        0px 1px 18px 0px rgba(0, 0, 0, 0.12);
      --ha-card-border-color: var(--divider-color);
    }

    .container {
      position: relative;
    }

    .container.edit-mode {
      padding: 8px;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      border: 2px dashed var(--divider-color);
      border-start-end-radius: 0;
    }

    .actions-container {
      position: relative;
      height: 34px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .actions {
      z-index: 1;
      position: absolute;
      height: 36px;
      bottom: -2px;
      right: 0;
      inset-inline-end: 0;
      inset-inline-start: initial;
      opacity: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s ease-in-out;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
      background: var(--secondary-background-color);
      --mdc-icon-button-size: 36px;
      --mdc-icon-size: 20px;
      color: var(--primary-text-color);
    }

    .add {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      outline: none;
      gap: var(--ha-space-2);
      height: 36px;
      padding: 6px 20px 6px 20px;
      box-sizing: border-box;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      background-color: transparent;
      border-width: 2px;
      border-style: dashed;
      border-color: var(--primary-color);
      --mdc-icon-size: 18px;
      cursor: pointer;
      font-size: var(--ha-font-size-m);
      color: var(--primary-text-color);
      --ha-ripple-color: var(--primary-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
    }

    .add:focus {
      border-style: solid;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-footer": HuiViewFooter;
  }
}
