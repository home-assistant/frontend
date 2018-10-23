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
import { clearItems, fetchItems, addItem, completeItem, saveEdit } from "../../../data/shopping_list";

interface Config extends LovelaceConfig {
  title?: string;
}

interface ListItem {
  id: number;
  name: string;
  complete: boolean;
}

class HuiShoppingListCard extends HassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  protected hass?: HomeAssistant;
  protected config?: Config;
  private items?: ListItem[];

  static get properties() {
    return {
      hass: {},
      config: {},
      items: [],
    };
  }

  public getCardSize() {
    return (this.config ? (this.config.title ? 1 : 0) : 0) + (this.items ? this.items.length : 0);
  }

  public setConfig(config: Config) {
    this.config = config;
    this.items = [];
    this._fetchData();
  }

  public connectedCallback() {
    if (!this.hass) {
      return;
    }

    super.connectedCallback();
    this.hass.connection
      .subscribeEvents(this._fetchData, "shopping_list_updated")
      .then(() => this._fetchData());
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
  }

  protected render() {
    if (!this.config || !this.hass) {
      return html``;
    }

    // TODO placeholder='${this.localize('ui.panel.shopping-list.add_item')}' is coming back with an empty value
    return html`
      ${this.renderStyle()}
      <ha-card .header="${this.config.title}">
        <div class="addRow">
          <paper-input
            id='addBox'
            placeholder='Add Me'
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

      ${this.items!.map((item) => html`
        <paper-icon-item>
          <paper-checkbox
            slot="item-icon"
            ?checked=${item.complete}
            @click='${(e) => this._itemCompleteTapped(e, item.id)}'
            tabindex='0'
          ></paper-checkbox>
          <paper-item-body>
            <paper-input
              id='editBox'
              no-label-float
              .value='${item.name}'
              @change='${(e) => this._saveEdit(e, item.id)}'
            ></paper-input>
          </paper-item-body>
        </paper-icon-item>
        `)}
      </ha-card>
    `;
  }

  private renderStyle() {
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

  private _fetchData() {
    if (this.hass) {
      fetchItems(this.hass).then((items: {}) => this._assignItems(items));
    }
  }

  private _assignItems(items: {}) {
    this.items = items as ListItem[];
    this.items!.reverse();
  }

  private _itemCompleteTapped(ev, id) {
    ev.stopPropagation();
    if (this.hass) {
      completeItem(this.hass, id, ev.target.checked).catch(() => this._fetchData());
    }
  }

  private _addItem(ev) {
    if (this.shadowRoot && this.shadowRoot.querySelector("#addBox")) {
      const root = this.shadowRoot.querySelector("#addBox") as HTMLInputElement;
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

  private _addKeyPress(ev) {
    if (ev.keyCode === 13) {
      this._addItem(ev);
    }
  }

  private _saveEdit(ev, id) {
    if (this.hass && ev.target.value) {
      saveEdit(this.hass, id, ev.target.value).catch(() => this._fetchData());
    }

    setTimeout(() => ev.target.blur(), 10);
  }

  private _clearItems() {
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
