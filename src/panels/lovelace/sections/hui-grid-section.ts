import { mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-ripple";
import "../../../components/ha-sortable";
import type { HaSortableOptions } from "../../../components/ha-sortable";
import type { LovelaceSectionElement } from "../../../data/lovelace";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { HuiCard } from "../cards/hui-card";
import { computeCardGridSize } from "../common/compute-card-grid-size";
import "../components/hui-card-edit-mode";
import { moveCard } from "../editor/config-util";
import type { LovelaceCardPath } from "../editor/lovelace-path";
import type { Lovelace } from "../types";

const CARD_SORTABLE_OPTIONS: HaSortableOptions = {
  delay: 100,
  delayOnTouchOnly: true,
  direction: "vertical",
  invertedSwapThreshold: 0.7,
  group: "card",
} as HaSortableOptions;

const IMPORT_MODE_CARD_SORTABLE_OPTIONS: HaSortableOptions = {
  ...CARD_SORTABLE_OPTIONS,
  sort: false,
  group: {
    name: "card",
    put: false,
  },
};

@customElement("hui-grid-section")
export class GridSection extends LitElement implements LovelaceSectionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ attribute: false, type: Number }) public viewIndex?: number;

  @property({ attribute: false }) public isStrategy = false;

  @property({ attribute: false }) public cards: HuiCard[] = [];

  @property({ attribute: "import-only", type: Boolean })
  public importOnly = false;

  @state() _config?: LovelaceSectionConfig;

  @state() _dragging = false;

  public setConfig(config: LovelaceSectionConfig): void {
    this._config = config;
  }

  private _cardConfigKeys = new WeakMap<LovelaceCardConfig, string>();

  private _getKey(cardConfig: LovelaceCardConfig) {
    if (
      !this._cardConfigKeys.has(cardConfig) &&
      typeof cardConfig === "object"
    ) {
      this._cardConfigKeys.set(cardConfig, Math.random().toString());
    }
    return this._cardConfigKeys.get(cardConfig)!;
  }

  render() {
    if (!this.cards || !this._config) return nothing;

    const cardsConfig = this._config?.cards ?? [];

    const editMode = Boolean(this.lovelace?.editMode && !this.isStrategy);

    const sortableOptions = this.importOnly
      ? IMPORT_MODE_CARD_SORTABLE_OPTIONS
      : CARD_SORTABLE_OPTIONS;

    const background = this._config.style?.background_color;

    return html`
      <ha-sortable
        .disabled=${!editMode}
        @drag-start=${this._dragStart}
        @drag-end=${this._dragEnd}
        draggable-selector=".card"
        .rollback=${false}
        .options=${sortableOptions}
        @item-moved=${this._cardMoved}
        @item-added=${this._cardAdded}
        @item-removed=${this._cardRemoved}
        invert-swap
      >
        <div
          class="container ${classMap({
            "edit-mode": editMode,
            "import-only": this.importOnly,
            "has-background": Boolean(background),
          })}"
          style=${styleMap({
            background: background,
          })}
        >
          ${repeat(
            cardsConfig,
            (cardConfig) => this._getKey(cardConfig),
            (_cardConfig, idx) => {
              const card = this.cards![idx];
              card.layout = "grid";
              const gridOptions = card.getGridOptions();

              const { rows, columns } = computeCardGridSize(gridOptions);

              const cardPath: LovelaceCardPath = [
                this.viewIndex!,
                this.index!,
                idx,
              ];
              return html`
                <div
                  style=${styleMap({
                    "--column-size":
                      typeof columns === "number" ? columns : undefined,
                    "--row-size": typeof rows === "number" ? rows : undefined,
                  })}
                  class="card ${classMap({
                    "fit-rows": typeof rows === "number",
                    "full-width": columns === "full",
                  })}"
                  .sortableData=${cardPath}
                >
                  ${editMode
                    ? html`
                        <hui-card-edit-mode
                          .hass=${this.hass}
                          .lovelace=${this.lovelace!}
                          .path=${cardPath}
                          .hiddenOverlay=${this._dragging}
                          .noEdit=${this.importOnly}
                          .noDuplicate=${this.importOnly}
                        >
                          ${card}
                        </hui-card-edit-mode>
                      `
                    : card}
                </div>
              `;
            }
          )}
          ${editMode && !this.importOnly
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
                  <ha-ripple></ha-ripple>
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
    const { oldIndex, newIndex } = ev.detail;
    const newConfig = moveCard(
      this.lovelace!.config,
      [this.viewIndex!, this.index!, oldIndex],
      [this.viewIndex!, this.index!, newIndex]
    );
    this.lovelace!.saveConfig(newConfig);
  }

  private _cardAdded(ev) {
    const { index, data } = ev.detail;
    const oldPath = data as LovelaceCardPath;
    const newPath = [this.viewIndex!, this.index!, index] as LovelaceCardPath;
    const newConfig = moveCard(this.lovelace!.config, oldPath, newPath);
    this.lovelace!.saveConfig(newConfig);
  }

  private _cardRemoved(ev) {
    ev.stopPropagation();
    // Do nothing, it's handled by the "item-added" event from the new parent.
  }

  private _dragStart() {
    this._dragging = true;
  }

  private _dragEnd() {
    this._dragging = false;
  }

  private _addCard() {
    fireEvent(this, "ll-create-card", { suggested: ["tile", "heading"] });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          --base-column-count: 12;
          --row-gap: var(--ha-section-grid-row-gap, 8px);
          --column-gap: var(--ha-section-grid-column-gap, 8px);
          --row-height: var(--ha-section-grid-row-height, 56px);
          display: flex;
          flex-direction: column;
          gap: var(--row-gap);
        }
        .container {
          --grid-column-count: calc(
            var(--base-column-count) * var(--column-span, 1)
          );
          display: grid;
          grid-template-columns: repeat(
            var(--grid-column-count),
            minmax(0, 1fr)
          );
          grid-auto-rows: auto;
          row-gap: var(--row-gap);
          column-gap: var(--column-gap);
          padding: 0;
          margin: 0 auto;
        }

        .container.edit-mode {
          padding: 8px;
          border-radius: var(--ha-card-border-radius, 12px);
          border-start-end-radius: 0;
          border: 2px dashed var(--divider-color);
          min-height: var(--row-height);
        }

        .container.import-only {
          border: none;
          padding: 0 !important;
        }
        .container.has-background {
          padding: 8px;
          border-radius: var(--ha-card-border-radius, 12px);
        }

        .card {
          border-radius: var(--ha-card-border-radius, 12px);
          position: relative;
          grid-row: span var(--row-size, 1);
          grid-column: span min(var(--column-size, 1), var(--grid-column-count));
        }

        .container.edit-mode .card {
          min-height: calc((var(--row-height) - var(--row-gap)) / 2);
        }

        .card.fit-rows {
          height: calc(
            (var(--row-size, 1) * (var(--row-height) + var(--row-gap))) - var(
                --row-gap
              )
          );
        }

        .card.full-width {
          grid-column: 1 / -1;
        }

        .card:has(> *) {
          display: block;
        }

        .card:has(> *[hidden]) {
          display: none;
        }

        .add {
          position: relative;
          outline: none;
          grid-row: span 1;
          grid-column: span 3;
          background: none;
          cursor: pointer;
          border-radius: var(--ha-card-border-radius, 12px);
          border: 2px dashed var(--primary-color);
          height: var(--row-height);
          order: 1;
          --ha-ripple-color: var(--primary-color);
          --ha-ripple-hover-opacity: 0.04;
          --ha-ripple-pressed-opacity: 0.12;
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
