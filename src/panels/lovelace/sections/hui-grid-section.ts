import { mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HaSortableOptions } from "../../../components/ha-sortable";
import { LovelaceSectionElement } from "../../../data/lovelace";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { HuiErrorCard } from "../cards/hui-error-card";
import "../components/hui-card-edit-mode";
import { moveCard } from "../editor/config-util";
import type { Lovelace, LovelaceCard, LovelaceLayoutOptions } from "../types";

const CARD_SORTABLE_OPTIONS: HaSortableOptions = {
  delay: 100,
  delayOnTouchOnly: true,
  direction: "vertical",
  invertedSwapThreshold: 0.7,
} as HaSortableOptions;

export class GridSection extends LitElement implements LovelaceSectionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ type: Number }) public viewIndex?: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public cards: Array<
    LovelaceCard | HuiErrorCard
  > = [];

  @state() _config?: LovelaceSectionConfig;

  @state() _dragging = false;

  public setConfig(config: LovelaceSectionConfig): void {
    this._config = config;
  }

  private _cardConfigKeys = new WeakMap<LovelaceCardConfig, string>();

  private _getKey(cardConfig: LovelaceCardConfig) {
    if (!this._cardConfigKeys.has(cardConfig)) {
      this._cardConfigKeys.set(cardConfig, Math.random().toString());
    }
    return this._cardConfigKeys.get(cardConfig)!;
  }

  render() {
    if (!this.cards || !this._config) return nothing;

    const cardsConfig = this._config?.cards ?? [];

    const editMode = Boolean(this.lovelace?.editMode && !this.isStrategy);

    return html`
      ${this._config.title || this.lovelace?.editMode
        ? html`
            <h2
              class="title ${classMap({
                placeholder: !this._config.title,
              })}"
            >
              ${this._config.title ||
              this.hass.localize(
                "ui.panel.lovelace.editor.section.unnamed_section"
              )}
            </h2>
          `
        : nothing}
      <ha-sortable
        .disabled=${!editMode}
        @item-moved=${this._cardMoved}
        @drag-start=${this._dragStart}
        @drag-end=${this._dragEnd}
        group="card"
        draggable-selector=".card"
        .path=${[this.viewIndex, this.index]}
        .rollback=${false}
        .options=${CARD_SORTABLE_OPTIONS}
        invert-swap
      >
        <div class="container ${classMap({ "edit-mode": editMode })}">
          ${repeat(
            cardsConfig,
            (cardConfig) => this._getKey(cardConfig),
            (_cardConfig, idx) => {
              const card = this.cards![idx];
              (card as any).editMode = editMode;
              (card as any).lovelace = this.lovelace;

              const configOptions = _cardConfig.layout_options;
              const cardOptions = (card as any)?.getLayoutOptions?.() as
                | LovelaceLayoutOptions
                | undefined;

              const options = {
                ...cardOptions,
                ...configOptions,
              } as LovelaceLayoutOptions;

              return html`
                <div
                  style=${styleMap({
                    "--column-size": options.grid_columns,
                    "--row-size": options.grid_rows,
                  })}
                  class="card ${classMap({
                    "fit-rows": typeof options?.grid_rows === "number",
                  })}"
                >
                  ${editMode
                    ? html`
                        <hui-card-edit-mode
                          .hass=${this.hass}
                          .lovelace=${this.lovelace}
                          .path=${[this.viewIndex, this.index, idx]}
                          .hiddenOverlay=${this._dragging}
                        >
                          ${card}
                        </hui-card-edit-mode>
                      `
                    : card}
                </div>
              `;
            }
          )}
          ${editMode
            ? html`
                <button
                  class="add"
                  @click=${this._addCard}
                  aria-label=${this.hass.localize(
                    "ui.panel.lovelace.editor.section.add_card"
                  )}
                  .title=${this.hass.localize(
                    "ui.panel.lovelace.editor.section.add_card"
                  )}
                >
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                </button>
              `
            : nothing}
        </div>
      </ha-sortable>
    `;
  }

  private _cardMoved(ev) {
    ev.stopPropagation();
    const { oldIndex, newIndex, oldPath, newPath } = ev.detail;
    const newConfig = moveCard(
      this.lovelace!.config,
      [...oldPath, oldIndex] as [number, number, number],
      [...newPath, newIndex] as [number, number, number]
    );
    this.lovelace!.saveConfig(newConfig);
  }

  private _dragStart() {
    this._dragging = true;
  }

  private _dragEnd() {
    this._dragging = false;
  }

  private _addCard() {
    fireEvent(this, "ll-create-card", { suggested: ["tile"] });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          --column-count: 4;
          --row-gap: var(--ha-section-grid-row-gap, 8px);
          --column-gap: var(--ha-section-grid-column-gap, 8px);
          --row-height: 66px;
          display: flex;
          flex-direction: column;
          gap: var(--row-gap);
        }
        .container {
          display: grid;
          grid-template-columns: repeat(var(--column-count), minmax(0, 1fr));
          grid-auto-rows: minmax(var(--row-height), auto);
          row-gap: var(--row-gap);
          column-gap: var(--column-gap);
          padding: 0;
          margin: 0 auto;
        }

        .container.edit-mode {
          padding: 8px;
          border-radius: var(--ha-card-border-radius, 12px);
          border: 2px dashed var(--divider-color);
          min-height: var(--row-height);
        }

        .title {
          color: var(--primary-text-color);
          font-size: 20px;
          font-weight: normal;
          margin: 0px;
          letter-spacing: 0.1px;
          line-height: 32px;
          min-height: 32px;
          display: block;
          padding: 24px 10px 10px;
        }

        .title.placeholder {
          color: var(--secondary-text-color);
          font-style: italic;
        }

        .card {
          border-radius: var(--ha-card-border-radius, 12px);
          position: relative;
          grid-row: span var(--row-size, 1);
          grid-column: span var(--column-size, 4);
        }

        .card.fit-rows {
          height: calc(
            (var(--row-size, 1) * (var(--row-height) + var(--row-gap))) - var(
                --row-gap
              )
          );
        }

        .card:has(> *) {
          display: block;
        }

        .card:has(> *[hidden]) {
          display: none;
        }

        .add {
          outline: none;
          grid-row: span var(--row-size, 1);
          grid-column: span var(--column-size, 2);
          background: none;
          cursor: pointer;
          border-radius: var(--ha-card-border-radius, 12px);
          border: 2px dashed var(--primary-color);
          height: var(--row-height);
          order: 1;
        }
        .add:focus {
          border-style: solid;
        }
        .sortable-ghost {
          border-radius: var(--ha-card-border-radius, 12px);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-grid-section": GridSection;
  }
}

customElements.define("hui-grid-section", GridSection);
