import { mdiDelete, mdiDotsVertical, mdiPencil, mdiPlus } from "@mdi/js";
import { CSSResultGroup, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import "../../../components/ha-button-menu";
import "../../../components/ha-list-item";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";

import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { haStyle } from "../../../resources/styles";
import { ItemPath } from "../../../types";
import { HuiStackCard } from "./hui-stack-card";
import { GridCardConfig } from "./types";

@customElement("hui-section-card")
class HuiSectionCard extends HuiStackCard<GridCardConfig> {
  private _cardConfigKeys = new WeakMap<LovelaceCardConfig, string>();

  private _getKey(cardConfig: LovelaceCardConfig) {
    if (!this._cardConfigKeys.has(cardConfig)) {
      this._cardConfigKeys.set(cardConfig, Math.random().toString());
    }
    return this._cardConfigKeys.get(cardConfig)!;
  }

  @property({ attribute: false }) public itemPath?: ItemPath;

  render() {
    if (!this._cards) return nothing;

    const cardsConfig = this._config?.cards ?? [];

    const editMode = this.editMode;

    return html`
      <h1 class="card-header">Section</h1>
      <ha-sortable
        .disabled=${!editMode}
        group="card"
        draggable-selector=".card"
        .path=${[...(this.itemPath ?? []), "cards"]}
        .rollback=${false}
        swap-threshold="0.7"
      >
        <div class="container">
          ${repeat(
            cardsConfig,
            (cardConfig) => this._getKey(cardConfig),
            (cardConfig, idx) => {
              const card = this._cards![idx];
              (card as any).editMode = editMode;
              (card as any).inert = editMode && cardConfig.type !== "section";
              (card as any).itemPath = [idx];
              const size = card && card.getSize?.();
              return html`
                <div
                  class="card"
                  style=${styleMap({
                    "--column-size": size?.[0],
                    "--row-size": size?.[1],
                  })}
                >
                  <div class="card-wrapper">${card}</div>
                  ${editMode
                    ? html`
                        <div class="card-overlay">
                          <div class="card-actions">
                            <ha-button-menu
                              corner="BOTTOM_END"
                              menuCorner="END"
                            >
                              <ha-icon-button
                                slot="trigger"
                                .path=${mdiDotsVertical}
                              >
                              </ha-icon-button>
                              <ha-list-item graphic="icon">
                                Edit
                                <ha-svg-icon
                                  slot="graphic"
                                  .path=${mdiPencil}
                                ></ha-svg-icon>
                              </ha-list-item>
                              <ha-list-item graphic="icon" class="warning">
                                Delete
                                <ha-svg-icon
                                  class="warning"
                                  slot="graphic"
                                  .path=${mdiDelete}
                                ></ha-svg-icon>
                              </ha-list-item>
                            </ha-button-menu>
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
                <button class="add">
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                </button>
              `
            : nothing}
        </div>
      </ha-sortable>
    `;
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

        .card-header {
          color: var(--ha-card-header-color, --primary-text-color);
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-card-header-font-size, 24px);
          font-weight: normal;
          margin-block-start: 0px;
          margin-block-end: 0px;
          letter-spacing: -0.012em;
          line-height: 32px;
          display: block;
          padding: 24px 16px 16px;
        }

        .card {
          position: relative;
          grid-row: span var(--row-size, 1);
          grid-column: span var(--column-size, 4);
        }
        .add {
          grid-row: span var(--row-size, 1);
          grid-column: span var(--column-size, 2);
        }

        .card-wrapper {
          height: 100%;
          cursor: grab;
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
        }

        .container:not(.dragging) .card:hover .card-overlay {
          opacity: 1;
          pointer-events: auto;
        }

        .card-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--card-background-color);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          height: 32px;
          border-radius: 16px;
          margin: 2px;
        }
        .card-actions ha-icon-button {
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 20px;
          cursor: pointer;
        }

        :host([edit-mode]) .container {
          padding: 10px;
          border-radius: var(--ha-card-border-radius, 12px);
          border: 2px dashed var(--divider-color);
          min-height: 60px;
        }

        .add {
          background: none;
          cursor: pointer;
          border-radius: var(--ha-card-border-radius, 12px);
          border: 2px dashed var(--primary-color);
          min-height: 60px;
          order: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-card": HuiSectionCard;
  }
}
