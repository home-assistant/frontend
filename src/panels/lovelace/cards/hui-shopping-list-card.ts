import { html, LitElement } from "@polymer/lit-element";
import { repeat } from "lit-html/directives/repeat";
import "@polymer/paper-checkbox/paper-checkbox.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-input/paper-input.js";
import "@polymer/paper-item/paper-icon-item.js";
import "@polymer/paper-item/paper-item-body.js";
import "@polymer/paper-fab/paper-fab.js";

import "../../../components/ha-card.js";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types.js";
import { LovelaceCard, LovelaceConfig } from "../types.js";
import {
  clearItems,
  fetchItems,
  addItem,
  completeItem,
  saveEdit,
  deleteItem,
} from "../../../data/shopping_list";
import { TemplateResult } from "lit-html";

interface Config extends LovelaceConfig {
  title?: string;
}

export interface ShoppingListItem {
  id: number;
  name: string;
  complete: boolean;
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

  public connectedCallback() {
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

  public disconnectedCallback() {
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
        <div class="addRow">
          <paper-input
            id='addBox'
            placeholder='${this.localize("ui.card.shopping-list.add_item")}'
            @keydown=${this._addKeyPress}
            no-label-float
          ></paper-input>
          <paper-icon-button
            slot="item-icon"
            icon="hass:plus"
            @click=${this._addItem}
          ></paper-icon-button>
          <paper-icon-button
            slot="item-icon"
            icon="hass:notification-clear-all"
            @click=${this._clearItems}
          ></paper-icon-button>
        </div>

      ${repeat(
        this._items!,
        (item) => html`
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
      )}
      </ha-card>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .addRow, .editRow {
          display: flex;
          flex-direction: row;
        }
        .addRow {
          padding-left: 16px;
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
          position: relative;
          top: 1px;
        }
      </style>
    `;
  }

  private async _fetchData(): Promise<ShoppingListItem[]> {
    if (this.hass) {
      this._items = await fetchItems(this.hass);
      this._items.reverse();
    }

    return this._items!;
  }

  private _completeItem(ev): void {
    completeItem(this.hass!, ev.target.itemId, ev.target.checked).catch(() =>
      this._fetchData()
    );
  }

  private _addItem(): void {
    if (this.shadowRoot!.querySelector("#addBox")) {
      const root = this.shadowRoot!.querySelector(
        "#addBox"
      ) as HTMLInputElement;

      if (this.hass && root.value.length > 0) {
        addItem(this.hass, root.value).catch(() => this._fetchData());
      }

      root.value = "";
      setTimeout(() => root.focus(), 10);
    }
  }

  private _addKeyPress(ev): void {
    if (ev.keyCode === 13) {
      this._addItem();
    }
  }

  private _saveEdit(ev): void {
    saveEdit(this.hass!, ev.target.itemId, ev.target.value).catch(() =>
      this._fetchData()
    );

    setTimeout(() => ev.target.blur(), 10);
  }

  private _clearItems(): void {
    if (this.hass) {
      clearItems(this.hass).catch(() => this._fetchData());
    }
  }

  private _deleteItem(ev): void {
    deleteItem(this.hass!, ev.target.itemId).catch(() => this._fetchData());
  }

  private _showEditOptions(ev): void {
    const row = ev.target;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shopping-list-card": HuiShoppingListCard;
  }
}

customElements.define("hui-shopping-list-card", HuiShoppingListCard);
