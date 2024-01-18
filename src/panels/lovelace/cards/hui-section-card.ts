import { mdiArrowAll, mdiDotsVertical, mdiPlus } from "@mdi/js";
import { CSSResultGroup, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
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

  @property() public itemPath?: ItemPath;

  render() {
    if (!this._cards) return nothing;

    const cardsConfig = this._config?.cards ?? [];

    const editMode = this.editMode;

    return html`
      <h1 class="card-header">Section</h1>
      <ha-sortable
        .disabled=${!editMode}
        group="card"
        handle-selector=".handle"
        draggable-selector=".card"
        .path=${[...(this.itemPath ?? []), "cards"]}
        .rollback=${false}
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
                              .index=${idx}
                              .path=${mdiDotsVertical}
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
      css`
        .container {
          --column-count: 2;
          display: grid;
          grid-template-columns: repeat(var(--column-count), minmax(0, 1fr));
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
          height: fit-content;
        }

        .card-wrapper {
          height: fit-content;
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
