import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import { SortableEvent } from "sortablejs";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-state-label-badge";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import type {
  LovelaceCardConfig,
  LovelaceViewConfig,
  LovelaceViewElement,
} from "../../../data/lovelace";
import { SortableInstance } from "../../../resources/sortable";
import { loadSortable } from "../../../resources/sortable.ondemand";
import type { HomeAssistant } from "../../../types";
import type { HuiErrorCard } from "../cards/hui-error-card";
import type { Lovelace, LovelaceCard } from "../types";

@customElement("hui-sections-view")
export class SectionsView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Boolean }) public narrow!: boolean;

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

  protected firstUpdated(
    _changedProperties: Map<string | number | symbol, unknown>
  ): void {
    this._createSortable();
  }

  public disconnectedCallback() {
    this._destroySortable();
  }

  protected render(): TemplateResult {
    const cardsConfig = this._config?.cards ?? [];

    return html`
      <div class="container">
        <div class="header">
          <h1>Section</h1>
          ${this.lovelace?.editMode
            ? html`
                <mwc-button outlined @click=${this._addCard}>
                  Add card
                </mwc-button>
              `
            : ""}
        </div>

        <div id="grid">
          ${repeat(
            cardsConfig,
            (cardConfig) => this._getKey(cardConfig),
            (cardConfig, idx) => {
              const card = this.cards[idx];
              return html`
                <div
                  class=${classMap({
                    draggable: !!this.lovelace?.editMode,
                  })}
                  style=${styleMap({
                    "--row-size": cardConfig.view_layout?.size?.[0],
                    "--column-size": cardConfig.view_layout?.size?.[1],
                  })}
                >
                  ${card}
                </div>
              `;
            }
          )}
        </div>
      </div>
    `;
  }

  private _sortable?: SortableInstance;

  private async _createSortable() {
    const Sortable = await loadSortable();
    this._sortable = new Sortable(this.shadowRoot!.querySelector("#grid")!, {
      animation: 500,
      draggable: ".draggable",
      swapThreshold: 0.5,
      onSort: (evt: SortableEvent) => {
        this._dragged(evt);
      },
    });
  }

  private _dragged(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) return;
    this._move(ev.oldIndex!, ev.newIndex!);
  }

  private _move(index: number, newIndex: number) {
    const config = this._config;
    if (config) {
      const cardsConfig = [...(config.cards ?? [])];

      const cardConfig = cardsConfig.splice(index, 1)[0];
      cardsConfig.splice(newIndex, 0, cardConfig);
      const newConfig = {
        ...config,
        cards: cardsConfig,
      };

      this.lovelace?.saveConfig({
        ...this.lovelace.config,
        views: this.lovelace.config.views.map((view, i) =>
          i === this.index ? newConfig : view
        ),
      });
    }
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private _addCard(): void {
    fireEvent(this, "ll-create-card");
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        padding-top: 4px;
        height: 100%;
        box-sizing: border-box;
        --grid-gap: 8px;
        --grid-cell-height: 64px;
        --grid-cell-width: 168px;
      }
      .container {
        max-width: 1000px;
        margin: auto;
      }
      .header {
        padding: 0 var(--grid-gap);
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      #grid {
        padding: var(--grid-gap);
        gap: var(--grid-gap);
        display: grid;
        grid-template-rows: var(--grid-cell-height);
        grid-template-columns: repeat(
          auto-fill,
          minmax(var(--grid-cell-width), 1fr)
        );
        grid-auto-flow: row dense;
        grid-auto-columns: min-content;
      }
      #grid > div {
        position: relative;
        grid-row: span var(--row-size, 1);
        grid-column: span var(--column-size, 1);
      }
      .draggable {
        cursor: move;
      }
      .draggable > * {
        pointer-events: none;
      }
      .sortable-ghost {
        opacity: 0.4;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sections-view": SectionsView;
  }
}
