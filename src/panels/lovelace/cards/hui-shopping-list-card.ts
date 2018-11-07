import { html, LitElement } from "@polymer/lit-element";
import { repeat } from "lit-html/directives/repeat";
import { TemplateResult } from "lit-html";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-input/paper-input";

import "../../../components/ha-card";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceConfig } from "../types";
import {
  fetchItems,
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
  private _config?: Config;
  private _items?: ShoppingListItem[];
  private _unsubEvents?: Promise<() => Promise<void>>;

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
      this._unsubEvents = this.hass.connection.subscribeEvents(
        () => this._fetchData(),
        "shopping_list_updated"
      );
      this._fetchData();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();

    if (this._unsubEvents) {
      this._unsubEvents.then((unsub) => unsub());
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
        this._items!.filter((item) => !item.complete),
        (item) => item.id,
        (item, index) =>
          html`
        <div class="editRow">
          <paper-checkbox
            slot="item-icon"
            id=${index}
            ?checked=${item.complete}
            .itemId=${item.id}
            @click=${this._completeItem}
            tabindex='0'
          ></paper-checkbox>
          <paper-item-body>
            <paper-input
              no-label-float
              value=${item.name}
              .itemId=${item.id}
              @change=${this._saveEdit}
            ></paper-input>
          </paper-item-body>
        </div>
        `
      )}
        <div class="divider"></div>
        <div class="label">
          ${this.localize("ui.panel.lovelace.shopping-list.checked_items")}
        </div>
      ${repeat(
        this._items!.filter((item) => item.complete),
        (item) => item.id,
        (item, index) =>
          html`
        <div class="editRow">
          <paper-checkbox
            slot="item-icon"
            id=${index}
            ?checked=${item.complete}
            .itemId=${item.id}
            @click=${this._completeItem}
            tabindex='0'
          ></paper-checkbox>
          <paper-item-body>
            <paper-input
              no-label-float
              value=${item.name}
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
        .editRow {
          display: flex;
          flex-direction: row;
        }
        paper-checkbox {
          padding: 11px 11px 11px 18px;
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
        .label {
          color: var(--primary-color);
          margin-left: 17px;
          margin-bottom: 11px;
          margin-top: 11px;
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

  private _saveEdit(ev): void {
    saveEdit(this.hass!, ev.target.itemId, ev.target.value).catch(() =>
      this._fetchData()
    );

    ev.target.blur();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shopping-list-card": HuiShoppingListCard;
  }
}

customElements.define("hui-shopping-list-card", HuiShoppingListCard);
