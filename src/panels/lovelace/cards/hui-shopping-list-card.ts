import { html, LitElement } from "@polymer/lit-element";
import "@polymer/paper-checkbox/paper-checkbox.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-input/paper-input.js";
import "@polymer/paper-item/paper-icon-item.js";
import "@polymer/paper-item/paper-item-body.js";

import "../../../components/ha-card.js";

import { HassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types.js";
import { LovelaceCard, LovelaceConfig } from "../types.js";
import {
  clearItems,
  fetchItems,
  addItem,
  completeItem,
  saveEdit,
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

class HuiShoppingListCard extends HassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  protected config?: Config;
  private items?: ShoppingListItem[];

  static get properties() {
    return {
      config: {},
      items: {},
    };
  }

  public getCardSize(): number {
    return (
      (this.config ? (this.config.title ? 1 : 0) : 0) +
      (this.items ? this.items.length : 3)
    );
  }

  public setConfig(config: Config): void {
    this.config = config;
    this.items = [];
    this._fetchData();
  }

  public connectedCallback(): void {
    if (!this.hass) {
      return;
    }

    super.connectedCallback();
    this.hass.connection
      .subscribeEvents(this._fetchData, "shopping_list_updated")
      .then(() => this._fetchData());
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-card .header="${this.config.title}">
        <div class="addRow">
          <paper-input
            id='addBox'
            placeholder='${this.localize("ui.panel.shopping-list.add_item")}'
            @keydown='${(e) => this._addKeyPress(e)}'
            no-label-float
          ></paper-input>
          <paper-icon-button
            slot="item-icon"
            icon="hass:plus"
            @click='${(e) => this._addItem(e)}'
          ></paper-icon-button>
          <paper-icon-button
            slot="item-icon"
            icon="hass:notification-clear-all"
            @click='${() => this._clearItems()}'
          ></paper-icon-button>
        </div>

      ${this.items!.map(
        (item) => html`
        <paper-icon-item>
          <paper-checkbox
            slot="item-icon"
            ?checked=${item.complete}
            .itemId=${item.id}
            @click='${(e) => this._itemCompleteTapped(e)}'
            tabindex='0'
          ></paper-checkbox>
          <paper-item-body>
            <paper-input
              no-label-float
              .value='${item.name}'
              .itemId=${item.id}
              @change='${(e) => this._saveEdit(e)}'
            ></paper-input>
          </paper-item-body>
        </paper-icon-item>
        `
      )}
      </ha-card>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .addRow {
          padding-left: 16px;
          display: inline-block;
        }
        .addRow > paper-icon-button {
          display: inline-block;
        }
        .addRow > paper-input {
          display: inline-block;
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
      this.items = await fetchItems(this.hass);
      this.items.reverse();
    }

    return this.items!;
  }

  private _itemCompleteTapped(ev): void {
    completeItem(this.hass!, ev.target.itemId, ev.target.checked).catch(() =>
      this._fetchData()
    );
  }

  private _addItem(ev): void {
    if (this.shadowRoot!.querySelector("#addBox")) {
      const root = this.shadowRoot!.querySelector(
        "#addBox"
      ) as HTMLInputElement;
      const name = root.value;

      if (this.hass) {
        addItem(this.hass, name).catch(() => this._fetchData());
      }

      root.value = "";
      // Presence of 'ev' means tap on "add" button.
      if (ev) {
        setTimeout(() => root.focus(), 10);
      }
    }
  }

  private _addKeyPress(ev): void {
    if (ev.keyCode === 13) {
      this._addItem(ev);
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shopping-list-card": HuiShoppingListCard;
  }
}

customElements.define("hui-shopping-list-card", HuiShoppingListCard);
