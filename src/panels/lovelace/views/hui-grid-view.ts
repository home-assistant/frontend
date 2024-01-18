import { mdiArrowAll, mdiDelete, mdiPencil, mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../common/dom/fire_event";
import { nestedArrayMove } from "../../../common/util/array_move";
import "../../../components/ha-icon-button";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { LovelaceViewElement } from "../../../data/lovelace";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import { HuiErrorCard } from "../cards/hui-error-card";
import type { Lovelace, LovelaceCard } from "../types";

@customElement("hui-grid-view")
export class GridView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public cards: Array<
    LovelaceCard | HuiErrorCard
  > = [];

  @state() private _config?: LovelaceViewConfig;

  public setConfig(config: LovelaceViewConfig): void {
    this._config = config;
  }

  private _cardConfigKeys = new WeakMap<LovelaceCardConfig, string>();

  private _getKey(cardConfig: LovelaceCardConfig) {
    if (!this._cardConfigKeys.has(cardConfig)) {
      this._cardConfigKeys.set(cardConfig, Math.random().toString());
    }
    return this._cardConfigKeys.get(cardConfig)!;
  }

  protected render() {
    if (!this.lovelace) return nothing;

    const cardsConfig = this._config?.cards ?? [];

    const editMode = this.lovelace.editMode;

    return html`
      <ha-sortable
        .disabled=${!editMode}
        @item-moved=${this._cardMoved}
        group="section"
        handle-selector=".handle"
        draggable-selector=".card"
        .rollback=${false}
      >
        <div class="container ${classMap({ "edit-mode": editMode })}">
          ${repeat(
            cardsConfig,
            (cardConfig) => this._getKey(cardConfig),
            (cardConfig, idx) => {
              const card = this.cards[idx];
              (card as any).editMode = editMode;
              (card as any).inert = editMode && cardConfig.type !== "section";
              (card as any).itemPath = [idx];
              return html`
                <div class="card">
                  <div class="card-wrapper">${card}</div>
                  ${editMode
                    ? html`
                        <div class="card-overlay">
                          <div class="card-actions">
                            <ha-svg-icon
                              class="handle"
                              .path=${mdiArrowAll}
                            ></ha-svg-icon>
                            <ha-icon-button
                              @click=${this._editCard}
                              .index=${idx}
                              .path=${mdiPencil}
                            ></ha-icon-button>
                            <ha-icon-button
                              @click=${this._deleteCard}
                              .index=${idx}
                              .path=${mdiDelete}
                            ></ha-icon-button>
                          </div>
                        </div>
                      `
                    : nothing}
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

  private _addCard(): void {
    const cards = [
      ...(this._config!.cards ?? []),
      { type: "section", cards: [] },
    ];

    const config = this._config!;
    const newConfig = {
      ...config,
      cards,
    };
    this.lovelace?.saveConfig({
      ...this.lovelace.config,
      views: this.lovelace.config.views.map((view, i) =>
        i === this.index ? newConfig : view
      ),
    });
  }

  private _editCard(ev): void {
    fireEvent(this, "ll-edit-card", {
      path: [this.index!, ev.target.index],
    });
  }

  private _deleteCard(ev): void {
    fireEvent(this, "ll-delete-card", {
      confirm: true,
      path: [this.index!, ev.target.index],
    });
  }

  private _cardMoved(ev: CustomEvent) {
    const cards = nestedArrayMove(
      deepClone(this._config!.cards),
      ev.detail.oldIndex,
      ev.detail.newIndex,
      ev.detail.oldPath,
      ev.detail.newPath
    );

    const config = this._config!;
    const newConfig = {
      ...config,
      cards,
    };

    this.lovelace?.saveConfig({
      ...this.lovelace.config,
      views: this.lovelace.config.views.map((view, i) =>
        i === this.index ? newConfig : view
      ),
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        padding-top: 4px;
      }

      .card {
        position: relative;
      }

      .container {
        --column-count: 3;
        display: grid;
        grid-template-columns: repeat(var(--column-count), minmax(0, 1fr));
        gap: 10px;
        max-width: 1200px;
        padding: 10px;
        margin: 0 auto;
      }

      @media (max-width: 1200px) {
        .container {
          --column-count: 2;
        }
      }

      @media (max-width: 600px) {
        .container {
          --column-count: 1;
        }
      }

      .card-overlay {
        position: absolute;
        top: 0;
        right: 0;
        display: flex;
        opacity: 0;
        pointer-events: none;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease-in-out;
        background-color: rgba(var(--rgb-card-background-color), 0.3);
      }

      .card:hover .card-overlay {
        opacity: 1;
        pointer-events: auto;
      }

      .card-actions {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card-actions ha-svg-icon {
        padding: 4px;
      }
      .handle {
        cursor: grab;
      }
      .add {
        background: none;
        cursor: pointer;
        border-radius: var(--ha-card-border-radius, 12px);
        border: 2px dashed var(--primary-color);
        min-height: 60px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-grid-view": GridView;
  }
}
