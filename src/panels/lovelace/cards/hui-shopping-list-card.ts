import { html, LitElement } from "@polymer/lit-element";
import { repeat } from "lit-html/directives/repeat";
import { TemplateResult } from "lit-html";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-button/paper-button";

import "../../../components/ha-card";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceConfig } from "../types";
import {
  clearItems,
  fetchItems,
  addItem,
  completeItem,
  saveEdit,
  ShoppingListItem,
} from "../../../data/shopping-list";

interface Config extends LovelaceConfig {
  title?: string;
}

class HuiShoppingListCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  protected _config?: Config;
  private _items?: ShoppingListItem[];
  private _unsubEvents?: () => Promise<void>;

  static get properties() {
    return {
      _config: {},
      _items: {},
    };
  }

  public getCardSize(): number {
    return (
      (this._config ? (this._config.title ? 1 : 0) : 0) +
      (this._items ? this._items.length : 3)
    );
  }

  public setConfig(config: Config): void {
    this._config = config;
    this._items = [];
    this._fetchData();
  }

  public connectedCallback(): void {
    super.connectedCallback();

    if (this.hass) {
      this.hass.connection
        .subscribeEvents(() => this._fetchData(), "shopping_list_updated")
        .then(
          (unsub: () => Promise<void>): void => {
            this._unsubEvents = unsub;
          }
        );
      this._fetchData();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this._unsubEvents) {
      this._unsubEvents();
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-card .header="${this._config.title}">
      ${repeat(
        this._items!,
        (item) => item.id,
        (item, index) =>
          !item.complete
            ? html`
        <div class="editRow">
          <paper-checkbox
            slot="item-icon"
            ?checked=${item.complete}
            .itemId=${item.id}
            @click=${this._completeItem}
            tabindex='0'
          ></paper-checkbox>
          <paper-item-body>
            <paper-input
              no-label-float
              .value='${item.name}'
              .itemId=${item.id}
              @change=${this._saveEdit}
            ></paper-input>
          </paper-item-body>
        </div>
        `
            : html``
      )}
        <div class="addRow">
          <paper-icon-button
            slot="item-icon"
            icon="hass:plus"
            @click=${this._addItem}
          ></paper-icon-button>
          <paper-item-body>
            <paper-input
              id='addBox'
              placeholder='${this.localize("ui.card.shopping-list.add_item")}'
              @keydown=${this._addKeyPress}
              no-label-float
            ></paper-input>
          </paper-item-body>
        </div>
        <div class="divider"></div>
      ${repeat(
        this._items!,
        (item) => item.id,
        (item, index) =>
          item.complete
            ? html`
        <div class="completedRow">
          <paper-checkbox
            slot="item-icon"
            ?checked=${item.complete}
            .itemId=${item.id}
            @click=${this._completeItem}
            tabindex='0'
          ></paper-checkbox>
          <paper-item-body>
            <paper-input
              class="completeBox"
              no-label-float
              .value='${item.name}'
              .itemId=${item.id}
              @change=${this._saveEdit}
            ></paper-input>
          </paper-item-body>
        </div>
        `
            : html``
      )}
        <paper-button @click=${this._clearItems}>
          ${this.localize("ui.card.shopping-list.clear_completed")}
        </paper-button>
      </ha-card>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .addRow, .editRow, .completedRow {
          display: flex;
          flex-direction: row;
        }
        .addBox {
          padding-left: 11px;
        }
        .addRow > paper-icon-button {
          color: var(--secondary-text-color);
        }
        paper-icon-item {
          border-top: 1px solid var(--divider-color);
        }
        paper-icon-item:first-child {
          border-top: 0;
        }
        paper-checkbox {
          padding: 11px;
        }
        paper-input {
          --paper-input-container-underline: {
            display: none;
          }
          --paper-input-container-underline-focus: {
            display: none;
          }
          --paper-input-container-underline-disabled: {
            display: none;
          }
          position: relative;
          top: 1px;
        }
        .divider {
          height: 1px;
          background-color: var(--divider-color);
          margin: 10px;
        }
      </style>
    `;
  }

  private async _fetchData(): Promise<void> {
    if (this.hass) {
      this._items = await fetchItems(this.hass);
    }
  }

  private _completeItem(ev): void {
    completeItem(this.hass!, ev.target.itemId, ev.target.checked).catch(() =>
      this._fetchData()
    );
  }

  private _addItem(ev): void {
    if (this.shadowRoot!.querySelector("#addBox")) {
      const root = this.shadowRoot!.querySelector(
        "#addBox"
      ) as HTMLInputElement;

      if (this.hass && root.value.length > 0) {
        addItem(this.hass, root.value).catch(() => this._fetchData());
      }

      root.value = "";
      if (ev) {
        root.focus();
      }
    }
  }

  private _addKeyPress(ev): void {
    if (ev.keyCode === 13) {
      this._addItem(null);
    }
  }

  private _saveEdit(ev): void {
    saveEdit(this.hass!, ev.target.itemId, ev.target.value).catch(() =>
      this._fetchData()
    );

    ev.target.blur();
  }

  private _clearItems(): void {
    if (this.hass) {
      clearItems(this.hass).catch(() => this._fetchData());
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shopping-list-card": HuiShoppingListCard;
  }
}

customElements.define("hui-shopping-list-card", HuiShoppingListCard);
