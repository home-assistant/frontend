import { mdiPencil, mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import "../../../components/ha-ripple";
import "../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import {
  DEFAULT_FOOTER_MAX_WIDTH_PX,
  type LovelaceViewConfig,
  type LovelaceViewFooterConfig,
} from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { HuiCard } from "../cards/hui-card";
import { computeCardGridSize } from "../common/compute-card-grid-size";
import { showCreateCardDialog } from "../editor/card-editor/show-create-card-dialog";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { replaceView } from "../editor/config-util";
import { showEditViewFooterDialog } from "../editor/view-footer/show-edit-view-footer-dialog";
import type { Lovelace } from "../types";

@customElement("hui-view-footer")
export class HuiViewFooter extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public card?: HuiCard;

  @property({ attribute: false }) public config?: LovelaceViewFooterConfig;

  @property({ attribute: false }) public viewIndex!: number;

  public connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("card-visibility-changed", this._checkHidden);
  }

  willUpdate(changedProperties: PropertyValues<this>): void {
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

  public disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("card-visibility-changed", this._checkHidden);
  }

  private _checkHidden() {
    const hidden =
      !this.lovelace?.editMode &&
      (!this.card || this.card.hasAttribute("hidden"));
    this.toggleAttribute("hidden", hidden);
    this.toggleAttribute("sticky", Boolean(this.card));
  }

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = document.createElement("hui-card");
    element.hass = this.hass;
    element.preview = this.lovelace.editMode;
    element.layout = "grid";
    element.config = cardConfig;
    element.addEventListener("card-updated", (ev: Event) => {
      ev.stopPropagation();
      this.requestUpdate();
    });
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
    showEditViewFooterDialog(this, {
      config: this.config || {},
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

  private _renderCard(card: HuiCard, editMode: boolean) {
    const gridOptions = card.getGridOptions();
    const { rows } = computeCardGridSize(gridOptions);

    return html`
      <div
        class="card ${classMap({
          "fit-rows": typeof rows === "number",
        })}"
        style=${styleMap({
          "--row-size": typeof rows === "number" ? String(rows) : undefined,
        })}
      >
        ${editMode
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
          : card}
      </div>
    `;
  }

  render() {
    if (!this.lovelace) return nothing;

    const editMode = Boolean(this.lovelace?.editMode);
    const card = this.card;

    if (!editMode && !card) {
      return nothing;
    }

    return html`
      <div
        class=${classMap({ wrapper: true, "edit-mode": editMode })}
        style=${styleMap({
          "--footer-max-width": `${this.config?.max_width || DEFAULT_FOOTER_MAX_WIDTH_PX}px`,
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
          ${card
            ? this._renderCard(card, editMode)
            : editMode
              ? html`
                  <button class="add" @click=${this._addCard}>
                    <ha-ripple></ha-ripple>
                    <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.edit_view_footer.add"
                    )}
                  </button>
                `
              : nothing}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host([hidden]) {
      display: none !important;
    }

    :host([sticky]) {
      position: sticky;
      bottom: var(--row-gap);
      z-index: 4;
    }

    .wrapper {
      padding: var(--ha-space-2) 0;
      padding-bottom: calc(
        max(var(--ha-space-2), var(--safe-area-inset-bottom, 0px))
      );
      box-sizing: content-box;
      margin: 0 auto;
      max-width: var(--footer-max-width, 600px);
    }

    .wrapper:not(.edit-mode) {
      --ha-card-box-shadow: var(
        --ha-view-footer-box-shadow,
        var(--ha-box-shadow-l)
      );
    }

    .container {
      --row-height: var(--ha-section-grid-row-height, 56px);
      --row-gap: var(--ha-section-grid-row-gap, 8px);
      --column-gap: var(--ha-section-grid-column-gap, 8px);
      position: relative;
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      grid-auto-rows: auto;
      row-gap: var(--row-gap);
      column-gap: var(--column-gap);
    }

    .container.edit-mode {
      padding: var(--ha-space-2);
      border-radius: var(
        --ha-section-border-radius,
        var(--ha-border-radius-xl)
      );
      border: 2px dashed var(--divider-color);
      border-start-end-radius: 0;
      background-color: var(--ha-color-surface-low);
    }

    .card {
      position: relative;
      grid-column: 1 / -1;
      grid-row: span var(--row-size, 1);
      max-height: 25vh;
      max-height: 25dvh;
    }

    .card.fit-rows {
      height: calc(
        (var(--row-size, 1) * (var(--row-height) + var(--row-gap))) - var(
            --row-gap
          )
      );
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
      border-radius: var(
        --ha-section-border-radius,
        var(--ha-border-radius-xl)
      );
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
      background: var(--ha-color-surface-low);
      border: var(--ha-border-width-md) dashed
        var(--ha-color-border-neutral-quiet);
      border-bottom: none;
      --ha-icon-button-size: 36px;
      --mdc-icon-size: 20px;
      color: var(--primary-text-color);
    }

    .add {
      grid-column: 1 / -1;
      margin: 0 auto;
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
      border-radius: var(
        --ha-section-border-radius,
        var(--ha-border-radius-xl)
      );
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
