import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { nestedArrayMove } from "../../../common/util/array_move";
import "../../../components/ha-sortable";
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

    return html`
      <ha-sortable
        draggable-selector=".card"
        no-style
        .disabled=${!this.lovelace.editMode}
        @item-moved=${this._cardMoved}
        group="card"
        .rollback=${false}
      >
        <div class="container">
          ${repeat(
            cardsConfig,
            (cardConfig) => this._getKey(cardConfig),
            (_cardConfig, idx) => {
              const card = this.cards[idx];
              return html`<div class="card">${card}</div>`;
            }
          )}
        </div>
      </ha-sortable>
    `;
  }

  private _cardMoved(ev: CustomEvent) {
    const cards = nestedArrayMove(
      this._config!.cards ?? [],
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
        height: fit-content;
      }

      .container {
        --column-count: 3;
        display: grid;
        grid-template-columns: repeat(var(--column-count), 1fr);
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-grid-view": GridView;
  }
}
