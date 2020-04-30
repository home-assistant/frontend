import "@polymer/paper-checkbox/paper-checkbox";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { repeat } from "lit-html/directives/repeat";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import {
  addItem,
  clearItems,
  fetchItems,
  ShoppingListItem,
  updateItem,
} from "../../../data/shopping-list";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { SensorCardConfig, ShoppingListCardConfig } from "./types";

@customElement("hui-shopping-list-card")
class HuiShoppingListCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-shopping-list-editor" */ "../editor/config-elements/hui-shopping-list-editor"
    );
    return document.createElement("hui-shopping-list-card-editor");
  }

  public static getStubConfig(): ShoppingListCardConfig {
    return { type: "shopping-list" };
  }

  @property() public hass?: HomeAssistant;

  @property() private _config?: ShoppingListCardConfig;

  @property() private _uncheckedItems?: ShoppingListItem[];

  @property() private _checkedItems?: ShoppingListItem[];

  private _unsubEvents?: Promise<() => Promise<void>>;

  public getCardSize(): number {
    return (this._config ? (this._config.title ? 1 : 0) : 0) + 3;
  }

  public setConfig(config: ShoppingListCardConfig): void {
    this._config = config;
    this._uncheckedItems = [];
    this._checkedItems = [];
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

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | SensorCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-card
        .header=${this._config.title}
        class=${classMap({
          "has-header": "title" in this._config,
        })}
      >
        <div class="addRow">
          <ha-icon
            class="addButton"
            icon="hass:plus"
            .title=${this.hass!.localize(
              "ui.panel.lovelace.cards.shopping-list.add_item"
            )}
            @click=${this._addItem}
          >
          </ha-icon>
          <paper-input
            no-label-float
            class="addBox"
            placeholder=${this.hass!.localize(
              "ui.panel.lovelace.cards.shopping-list.add_item"
            )}
            @keydown=${this._addKeyPress}
          ></paper-input>
        </div>
        ${repeat(
          this._uncheckedItems!,
          (item) => item.id,
          (item) =>
            html`
              <div class="editRow">
                <paper-checkbox
                  tabindex="0"
                  ?checked=${item.complete}
                  .itemId=${item.id}
                  @click=${this._completeItem}
                ></paper-checkbox>
                <paper-input
                  no-label-float
                  .value=${item.name}
                  .itemId=${item.id}
                  @change=${this._saveEdit}
                ></paper-input>
              </div>
            `
        )}
        ${this._checkedItems!.length > 0
          ? html`
              <div class="divider"></div>
              <div class="checked">
                <span>
                  ${this.hass!.localize(
                    "ui.panel.lovelace.cards.shopping-list.checked_items"
                  )}
                </span>
                <ha-icon
                  class="clearall"
                  tabindex="0"
                  icon="hass:notification-clear-all"
                  .title=${this.hass!.localize(
                    "ui.panel.lovelace.cards.shopping-list.clear_items"
                  )}
                  @click=${this._clearItems}
                >
                </ha-icon>
              </div>
              ${repeat(
                this._checkedItems!,
                (item) => item.id,
                (item) =>
                  html`
                    <div class="editRow">
                      <paper-checkbox
                        tabindex="0"
                        ?checked=${item.complete}
                        .itemId=${item.id}
                        @click=${this._completeItem}
                      ></paper-checkbox>
                      <paper-input
                        no-label-float
                        .value=${item.name}
                        .itemId=${item.id}
                        @change=${this._saveEdit}
                      ></paper-input>
                    </div>
                  `
              )}
            `
          : ""}
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        padding: 16px;
      }

      .has-header {
        padding-top: 0;
      }

      .editRow,
      .addRow,
      .checked {
        display: flex;
        flex-direction: row;
        align-items: center;
      }

      .addRow ha-icon {
        color: var(--secondary-text-color);
        --iron-icon-width: 26px;
        --iron-icon-height: 26px;
      }

      .addButton {
        padding-right: 16px;
        cursor: pointer;
      }

      paper-checkbox {
        padding-left: 4px;
        padding-right: 20px;
        --paper-checkbox-label-spacing: 0px;
      }

      paper-input {
        flex-grow: 1;
      }

      .checked {
        margin: 12px 0;
        justify-content: space-between;
      }

      .checked span {
        color: var(--primary-color);
      }

      .divider {
        height: 1px;
        background-color: var(--divider-color);
        margin: 10px 0;
      }

      .clearall {
        cursor: pointer;
      }
    `;
  }

  private async _fetchData(): Promise<void> {
    if (this.hass) {
      const checkedItems: ShoppingListItem[] = [];
      const uncheckedItems: ShoppingListItem[] = [];
      const items = await fetchItems(this.hass);
      for (const key in items) {
        if (items[key].complete) {
          checkedItems.push(items[key]);
        } else {
          uncheckedItems.push(items[key]);
        }
      }
      this._checkedItems = checkedItems;
      this._uncheckedItems = uncheckedItems;
    }
  }

  private _completeItem(ev): void {
    updateItem(this.hass!, ev.target.itemId, {
      complete: ev.target.checked,
    }).catch(() => this._fetchData());
  }

  private _saveEdit(ev): void {
    updateItem(this.hass!, ev.target.itemId, {
      name: ev.target.value,
    }).catch(() => this._fetchData());

    ev.target.blur();
  }

  private _clearItems(): void {
    if (this.hass) {
      clearItems(this.hass).catch(() => this._fetchData());
    }
  }

  private get _newItem(): PaperInputElement {
    return this.shadowRoot!.querySelector(".addBox") as PaperInputElement;
  }

  private _addItem(ev): void {
    const newItem = this._newItem;

    if (newItem.value!.length > 0) {
      addItem(this.hass!, newItem.value!).catch(() => this._fetchData());
    }

    newItem.value = "";
    if (ev) {
      newItem.focus();
    }
  }

  private _addKeyPress(ev): void {
    if (ev.keyCode === 13) {
      this._addItem(null);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shopping-list-card": HuiShoppingListCard;
  }
}
