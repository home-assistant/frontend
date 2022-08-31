import { mdiDrag, mdiNotificationClearAll, mdiPlus, mdiSort } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { guard } from "lit/directives/guard";
import { repeat } from "lit/directives/repeat";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import "../../../components/ha-checkbox";
import "../../../components/ha-textfield";
import {
  addItem,
  clearItems,
  fetchItems,
  reorderItems,
  ShoppingListItem,
  updateItem,
} from "../../../data/shopping-list";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { SensorCardConfig, ShoppingListCardConfig } from "./types";
import type { HaTextField } from "../../../components/ha-textfield";
import {
  loadSortable,
  SortableInstance,
} from "../../../resources/sortable.ondemand";

@customElement("hui-shopping-list-card")
class HuiShoppingListCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-shopping-list-editor");
    return document.createElement("hui-shopping-list-card-editor");
  }

  public static getStubConfig(): ShoppingListCardConfig {
    return { type: "shopping-list" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ShoppingListCardConfig;

  @state() private _uncheckedItems?: ShoppingListItem[];

  @state() private _checkedItems?: ShoppingListItem[];

  @state() private _reordering = false;

  @state() private _renderEmptySortable = false;

  private _sortable?: SortableInstance;

  @query("#sortable") private _sortableEl?: HTMLElement;

  public getCardSize(): number {
    return (this._config ? (this._config.title ? 2 : 0) : 0) + 3;
  }

  public setConfig(config: ShoppingListCardConfig): void {
    this._config = config;
    this._uncheckedItems = [];
    this._checkedItems = [];
  }

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    this._fetchData();
    return [
      this.hass!.connection.subscribeEvents(
        () => this._fetchData(),
        "shopping_list_updated"
      ),
    ];
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
      (changedProps.has("hass") && oldHass?.themes !== this.hass.themes) ||
      (changedProps.has("_config") && oldConfig?.theme !== this._config.theme)
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
          <ha-svg-icon
            class="addButton"
            .path=${mdiPlus}
            .title=${this.hass!.localize(
              "ui.panel.lovelace.cards.shopping-list.add_item"
            )}
            @click=${this._addItem}
          >
          </ha-svg-icon>
          <ha-textfield
            class="addBox"
            .placeholder=${this.hass!.localize(
              "ui.panel.lovelace.cards.shopping-list.add_item"
            )}
            @keydown=${this._addKeyPress}
          ></ha-textfield>
          <ha-svg-icon
            class="reorderButton"
            .path=${mdiSort}
            .title=${this.hass!.localize(
              "ui.panel.lovelace.cards.shopping-list.reorder_items"
            )}
            @click=${this._toggleReorder}
          >
          </ha-svg-icon>
        </div>
        ${this._reordering
          ? html`
              <div id="sortable">
                ${guard([this._uncheckedItems, this._renderEmptySortable], () =>
                  this._renderEmptySortable
                    ? ""
                    : this._renderItems(this._uncheckedItems!)
                )}
              </div>
            `
          : this._renderItems(this._uncheckedItems!)}
        ${this._checkedItems!.length > 0
          ? html`
              <div class="divider"></div>
              <div class="checked">
                <span>
                  ${this.hass!.localize(
                    "ui.panel.lovelace.cards.shopping-list.checked_items"
                  )}
                </span>
                <ha-svg-icon
                  class="clearall"
                  tabindex="0"
                  .path=${mdiNotificationClearAll}
                  .title=${this.hass!.localize(
                    "ui.panel.lovelace.cards.shopping-list.clear_items"
                  )}
                  @click=${this._clearItems}
                >
                </ha-svg-icon>
              </div>
              ${repeat(
                this._checkedItems!,
                (item) => item.id,
                (item) =>
                  html`
                    <div class="editRow">
                      <ha-checkbox
                        tabindex="0"
                        .checked=${item.complete}
                        .itemId=${item.id}
                        @change=${this._completeItem}
                      ></ha-checkbox>
                      <ha-textfield
                        class="item"
                        .value=${item.name}
                        .itemId=${item.id}
                        @change=${this._saveEdit}
                      ></ha-textfield>
                    </div>
                  `
              )}
            `
          : ""}
      </ha-card>
    `;
  }

  private _renderItems(items: ShoppingListItem[]) {
    return html`
      ${repeat(
        items,
        (item) => item.id,
        (item) =>
          html`
            <div class="editRow" item-id=${item.id}>
              <ha-checkbox
                tabindex="0"
                .checked=${item.complete}
                .itemId=${item.id}
                @change=${this._completeItem}
              ></ha-checkbox>
              <ha-textfield
                class="item"
                .value=${item.name}
                .itemId=${item.id}
                @change=${this._saveEdit}
              ></ha-textfield>
              ${this._reordering
                ? html`
                    <ha-svg-icon
                      .title=${this.hass!.localize(
                        "ui.panel.lovelace.cards.shopping-list.drag_and_drop"
                      )}
                      class="reorderButton"
                      .path=${mdiDrag}
                    >
                    </ha-svg-icon>
                  `
                : ""}
            </div>
          `
      )}
    `;
  }

  private async _fetchData(): Promise<void> {
    if (!this.hass) {
      return;
    }
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

  private get _newItem(): HaTextField {
    return this.shadowRoot!.querySelector(".addBox") as HaTextField;
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

  private async _toggleReorder() {
    this._reordering = !this._reordering;
    await this.updateComplete;
    if (this._reordering) {
      this._createSortable();
    } else {
      this._sortable?.destroy();
      this._sortable = undefined;
    }
  }

  private async _createSortable() {
    const Sortable = await loadSortable();
    const sortableEl = this._sortableEl;
    this._sortable = new Sortable(sortableEl!, {
      animation: 150,
      fallbackClass: "sortable-fallback",
      dataIdAttr: "item-id",
      handle: "ha-svg-icon",
      onEnd: async (evt) => {
        if (evt.newIndex === undefined || evt.oldIndex === undefined) {
          return;
        }
        // Since this is `onEnd` event, it's possible that
        // an item wa dragged away and was put back to its original position.
        if (evt.oldIndex !== evt.newIndex) {
          reorderItems(this.hass!, this._sortable!.toArray()).catch(() =>
            this._fetchData()
          );
          // Move the shopping list item in memory.
          this._uncheckedItems!.splice(
            evt.newIndex,
            0,
            this._uncheckedItems!.splice(evt.oldIndex, 1)[0]
          );
        }
        this._renderEmptySortable = true;
        await this.updateComplete;
        while (sortableEl?.lastElementChild) {
          sortableEl.removeChild(sortableEl.lastElementChild);
        }
        this._renderEmptySortable = false;
      },
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        padding: 16px;
        height: 100%;
        box-sizing: border-box;
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

      .item {
        margin-top: 8px;
      }

      .addButton {
        padding-right: 16px;
        padding-inline-end: 16px;
        cursor: pointer;
        direction: var(--direction);
      }

      .reorderButton {
        padding-left: 16px;
        padding-inline-start: 16px;
        cursor: pointer;
        direction: var(--direction);
      }

      ha-checkbox {
        margin-left: -12px;
        margin-inline-start: -12px;
        direction: var(--direction);
      }

      ha-textfield {
        flex-grow: 1;
      }

      .checked {
        margin: 12px 0;
        justify-content: space-between;
      }

      .checked span {
        color: var(--primary-text-color);
        font-weight: 500;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-shopping-list-card": HuiShoppingListCard;
  }
}
