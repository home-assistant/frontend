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
    return 1;
  }

  public setConfig(config: Config) {
    this.config = config;
    this.items = [];
  }

  protected render() {
    if (!this.config || !this.hass) {
      return html``;
    }

    // TODO Localize 'Add Item' text
    return html`
      ${this.renderStyle()}
      <ha-card .header="${this.config.title}">
        <div class="addRow">
          <paper-input
            id='addBox'
            placeholder='Add Item'
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
            icon="mdi:notification-clear-all"
            @click='${(e) => this._clearCompleted()}'
          ></paper-icon-button>
        </div>

      ${Object.values(this.items).map(item =>
        html`
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
              value='${item.name}'
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

  private connectedCallback() {
    super.connectedCallback();
    this._fetchData = this._fetchData.bind(this);

    this.hass.connection
      .subscribeEvents(this._fetchData, "shopping_list_updated")
      .then(
        function(unsub) {
          this._unsubEvents = unsub;
        }.bind(this)
      );
    this._fetchData();
  }

  private disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubEvents) {
      this._unsubEvents();
    }
  }

  private _fetchData() {
    this.hass.callApi("GET", "shopping_list").then(
      function(items) {
        items.reverse();
        this.items = items;
      }.bind(this)
    );
  }

  private _itemCompleteTapped(ev, id) {
    ev.stopPropagation();
    this.hass
      .callApi("POST", "shopping_list/item/" + id, {
        'complete': ev.target.checked,
      })
      .catch(() => this._fetchData());
  }

  private _addItem(ev) {
    if (!this.shadowRoot.querySelector('#addBox').value) {
      return;
    }

    this.hass.callApi("POST", "shopping_list/item", {
      'name': this.shadowRoot.querySelector('#addBox').value,
    }).catch(() => this._fetchData());

    this.shadowRoot.querySelector('#addBox').value = "";
    // Presence of 'ev' means tap on "add" button.
    if (ev) {
      setTimeout(() => this.shadowRoot.querySelector('#addBox').focus(), 10);
    }
  }

  private _addKeyPress(ev, id, name) {
    if (ev.keyCode === 13) {
      this._addItem();
    }
  }

  private _saveEdit(ev, id) {
    this.hass.callApi("POST", "shopping_list/item/" + id, {
      'name': ev.target.value,
    })
    .catch(() => this._fetchData());

    if (ev) {
      setTimeout(() => ev.target.blur(), 10);
    }
  }

  private _clearCompleted() {
    this.hass.callApi("POST", "shopping_list/clear_completed");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shopping-list-card": HuiShoppingListCard;
  }
}

customElements.define("hui-shopping-list-card", HuiShoppingListCard);
