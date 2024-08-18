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
import { HuiCard } from "../cards/hui-card";
import "../components/hui-card-edit-mode";
import { moveCard } from "../editor/config-util";
import type { Lovelace, LovelaceLayoutOptions } from "../types";
import { conditionalClamp } from "../../../common/number/clamp";

const CARD_SORTABLE_OPTIONS: HaSortableOptions = {
  delay: 100,
  delayOnTouchOnly: true,
  direction: "vertical",
  invertedSwapThreshold: 0.7,
} as HaSortableOptions;

export const DEFAULT_GRID_OPTIONS = {
  grid_columns: 4,
  grid_rows: "auto",
} as const satisfies LovelaceLayoutOptions;

type GridSizeValue = {
  rows?: number | "auto";
  columns?: number;
};

export const computeSizeOnGrid = (
  options: LovelaceLayoutOptions
): GridSizeValue => {
  const rows =
    typeof options.grid_rows === "number"
      ? conditionalClamp(
          options.grid_rows,
          options.grid_min_rows,
          options.grid_max_rows
        )
      : DEFAULT_GRID_OPTIONS.grid_rows;

  const columns =
    typeof options.grid_columns === "number"
      ? conditionalClamp(
          options.grid_columns,
          options.grid_min_columns,
          options.grid_max_columns
        )
      : DEFAULT_GRID_OPTIONS.grid_columns;

  return {
    rows,
    columns,
  };
};

export class GridSection extends LitElement implements LovelaceSectionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ type: Number }) public viewIndex?: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public cards: HuiCard[] = [];

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
              card.layout = "grid";
              const layoutOptions = card.getLayoutOptions();

              const { rows, columns } = computeSizeOnGrid(layoutOptions);

              return html`
                <div
                  style=${styleMap({
                    "--column-size": columns,
                    "--row-size": rows,
                  })}
                  class="card ${classMap({
                    "fit-rows": typeof layoutOptions?.grid_rows === "number",
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
          --row-height: var(--ha-section-grid-row-height, 56px);
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
          text-align: var(--ha-view-sections-title-text-align, start);
          min-height: 32px;
          display: block;
          height: var(--row-height);
          box-sizing: border-box;
          padding: 0 10px 10px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .title.placeholder {
          color: var(--secondary-text-color);
          font-style: italic;
        }

        .card {
          border-radius: var(--ha-card-border-radius, 12px);
          position: relative;
          grid-row: span var(--row-size);
          grid-column: span var(--column-size);
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
