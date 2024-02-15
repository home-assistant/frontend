import { mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { LovelaceSectionElement } from "../../../data/lovelace";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { HuiErrorCard } from "../cards/hui-error-card";
import "../components/hui-card-edit-mode";
import { moveCard } from "../editor/config-util";
import type { Lovelace, LovelaceCard } from "../types";

export class GridSection extends LitElement implements LovelaceSectionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index!: number;

  @property({ type: Number }) public viewIndex!: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public cards: Array<
    LovelaceCard | HuiErrorCard
  > = [];

  @state() _config?: LovelaceSectionConfig;

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
      <h2 class="section-header">${this._config.title ?? "Unnamed section"}</h2>
      <ha-sortable
        .disabled=${!editMode}
        @item-moved=${this._cardMoved}
        group="card"
        draggable-selector=".card"
        .path=${[this.viewIndex, this.index]}
        .rollback=${false}
        swap-threshold="0.7"
        delay="200"
      >
        <div class="container ${classMap({ "edit-mode": editMode })}">
          ${repeat(
            cardsConfig,
            (cardConfig) => this._getKey(cardConfig),
            (_cardConfig, idx) => {
              const card = this.cards![idx];
              (card as any).editMode = editMode;
              const size = card && (card as any).getSize?.();
              return html`
                <div
                  class="card"
                  style=${styleMap({
                    "--column-size": size?.[0],
                    "--row-size": size?.[1],
                  })}
                >
                  ${editMode
                    ? html`
                        <hui-card-edit-mode
                          .hass=${this.hass}
                          .lovelace=${this.lovelace}
                          .path=${[this.viewIndex, this.index, idx]}
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
                <button class="add" @click=${this._addCard}>
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

  private _addCard() {
    fireEvent(this, "ll-create-card");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          --column-count: 4;
          display: grid;
          grid-template-columns: repeat(var(--column-count), minmax(0, 1fr));
          grid-auto-rows: minmax(60px, auto);
          gap: 10px;
          padding: 0;
          margin: 0 auto;
        }

        .container.edit-mode {
          padding: 10px;
          border-radius: var(--ha-card-border-radius, 12px);
          border: 2px dashed var(--divider-color);
          min-height: 60px;
        }

        .section-header {
          color: var(--ha-card-header-color, --primary-text-color);
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-card-header-font-size, 24px);
          font-weight: normal;
          margin-block-start: 0px;
          margin-block-end: 0px;
          letter-spacing: -0.012em;
          line-height: 32px;
          min-height: 32px;
          display: block;
          padding: 24px 16px 16px;
        }

        .card {
          border-radius: var(--ha-card-border-radius, 12px);
          position: relative;
          grid-row: span var(--row-size, 1);
          grid-column: span var(--column-size, 4);
        }

        .add {
          grid-row: span var(--row-size, 1);
          grid-column: span var(--column-size, 2);
          background: none;
          cursor: pointer;
          border-radius: var(--ha-card-border-radius, 12px);
          border: 2px dashed var(--primary-color);
          min-height: 60px;
          order: 1;
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
