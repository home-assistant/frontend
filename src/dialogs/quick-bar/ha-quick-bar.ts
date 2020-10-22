import "@material/mwc-list/mwc-list";
import type { List } from "@material/mwc-list/mwc-list";
import { SingleSelectedEvent } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import type { ListItem } from "@material/mwc-list/mwc-list-item";
import { mdiConsoleLine } from "@mdi/js";
import {
  css,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import { styleMap } from "lit-html/directives/style-map";
import { scroll } from "lit-virtualizer";
import memoizeOne from "memoize-one";
import { componentsWithService } from "../../common/config/components_with_service";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { domainIcon } from "../../common/entity/domain_icon";
import "../../common/search/search-input";
import { compare } from "../../common/string/compare";
import {
  fuzzyFilterSort,
  ScorableTextItem,
} from "../../common/string/filter/sequence-matching";
import { debounce } from "../../common/util/debounce";
import "../../components/ha-circular-progress";
import "../../components/ha-dialog";
import "../../components/ha-header-bar";
import { domainToName } from "../../data/integration";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { QuickBarParams } from "./show-dialog-quick-bar";

interface QuickBarItem extends ScorableTextItem {
  icon: string;
  action(data?: any): void;
}

@customElement("ha-quick-bar")
export class QuickBar extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _commandItems: QuickBarItem[] = [];

  @internalProperty() private _entityItems: QuickBarItem[] = [];

  @internalProperty() private _items?: QuickBarItem[] = [];

  @internalProperty() private _filter = "";

  @internalProperty() private _search = "";

  @internalProperty() private _opened = false;

  @internalProperty() private _commandMode = false;

  @internalProperty() private _done = false;

  @query("search-input", false) private _filterInputField?: HTMLElement;

  private _focusSet = false;

  public async showDialog(params: QuickBarParams) {
    this._commandMode = params.commandMode || this._toggleIfAlreadyOpened();
    this._commandItems = this._generateCommandItems();
    this._entityItems = this._generateEntityItems();
    this._opened = true;
  }

  public closeDialog() {
    this._opened = false;
    this._done = false;
    this._focusSet = false;
    this._filter = "";
    this._search = "";
    this._items = [];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected updated(changedProperties: PropertyValues) {
    if (
      this._opened &&
      (changedProperties.has("_filter") ||
        changedProperties.has("_commandMode"))
    ) {
      this._setFilteredItems();
    }
  }

  protected render() {
    if (!this._opened) {
      return html``;
    }

    return html`
      <ha-dialog
        .heading=${true}
        open
        @opened=${this._handleOpened}
        @closed=${this.closeDialog}
        hideActions
      >
        <search-input
          dialogInitialFocus
          no-label-float
          slot="heading"
          class="heading"
          @value-changed=${this._handleSearchChange}
          .label=${this.hass.localize(
            "ui.dialogs.quick-bar.filter_placeholder"
          )}
          .filter=${this._commandMode ? `>${this._search}` : this._search}
          @keydown=${this._handleInputKeyDown}
          @focus=${this._setFocusFirstListItem}
        >
          ${this._commandMode
            ? html`<ha-svg-icon
                slot="prefix"
                class="prefix"
                .path=${mdiConsoleLine}
              ></ha-svg-icon>`
            : ""}
        </search-input>
        ${!this._items
          ? html`<ha-circular-progress
              size="small"
              active
            ></ha-circular-progress>`
          : html`<mwc-list
              @rangechange=${this._handleRangeChanged}
              @keydown=${this._handleListItemKeyDown}
              @selected=${this._handleSelected}
              style=${styleMap({
                height: `${Math.min(
                  this._items.length * (this._commandMode ? 56 : 72) + 26,
                  this._done ? 500 : 0
                )}px`,
              })}
            >
              ${scroll({
                items: this._items,
                renderItem: (item: QuickBarItem, index?: number) =>
                  this._renderItem(item, index),
              })}
            </mwc-list>`}
      </ha-dialog>
    `;
  }

  private _handleOpened() {
    this._setFilteredItems();
    this.updateComplete.then(() => {
      this._done = true;
    });
  }

  private async _handleRangeChanged(e) {
    if (this._focusSet) {
      return;
    }
    if (e.firstVisible > -1) {
      this._focusSet = true;
      await this.updateComplete;
      this._setFocusFirstListItem();
    }
  }

  private _renderItem(item: QuickBarItem, index?: number) {
    return html`
      <mwc-list-item
        .twoline=${Boolean(item.altText)}
        .item=${item}
        index=${ifDefined(index)}
        hasMeta
        graphic=${item.altText ? "avatar" : "icon"}
      >
        <ha-icon .icon=${item.icon} slot="graphic"></ha-icon>
        <span>${item.text}</span>
        ${item.altText
          ? html`
              <span slot="secondary" class="secondary">${item.altText}</span>
            `
          : null}
      </mwc-list-item>
    `;
  }

  private async processItemAndCloseDialog(item: QuickBarItem, index: number) {
    this._addSpinnerToCommandItem(index);

    await item.action();
    this.closeDialog();
  }

  private _handleSelected(ev: SingleSelectedEvent) {
    const index = ev.detail.index;
    const item = ((ev.target as List).items[index] as any).item;
    this.processItemAndCloseDialog(item, index);
  }

  private _handleInputKeyDown(ev: KeyboardEvent) {
    if (ev.code === "Enter") {
      if (!this._items?.length) {
        return;
      }

      this.processItemAndCloseDialog(this._items[0], 0);
    } else if (ev.code === "ArrowDown") {
      ev.preventDefault();
      this._getItemAtIndex(0)?.focus();
      this._getItemAtIndex(1)?.focus();
    }
  }

  private _getItemAtIndex(index: number): ListItem | null {
    return this.renderRoot.querySelector(`mwc-list-item[index="${index}"]`);
  }

  private _addSpinnerToCommandItem(index: number): void {
    const spinner = document.createElement("ha-circular-progress");
    spinner.size = "small";
    spinner.slot = "meta";
    spinner.active = true;
    this._getItemAtIndex(index)?.appendChild(spinner);
  }

  private _handleSearchChange(ev: CustomEvent): void {
    const newFilter = ev.detail.value;
    const oldCommandMode = this._commandMode;

    if (newFilter.startsWith(">")) {
      this._commandMode = true;
      this._search = newFilter.substring(1);
    } else {
      this._commandMode = false;
      this._search = newFilter;
    }

    this._debouncedSetFilter(this._search);

    if (oldCommandMode !== this._commandMode) {
      this._items = undefined;
      this._focusSet = false;
    }
  }

  private _debouncedSetFilter = debounce((filter: string) => {
    this._filter = filter;
  }, 100);

  private _setFocusFirstListItem() {
    // @ts-ignore
    this._getItemAtIndex(0)?.rippleHandlers.startFocus();
  }

  private _handleListItemKeyDown(ev: KeyboardEvent) {
    const isSingleCharacter = ev.key.length === 1;
    const isFirstListItem =
      (ev.target as HTMLElement).getAttribute("index") === "0";
    if (ev.key === "ArrowUp") {
      if (isFirstListItem) {
        this._filterInputField?.focus();
      }
    }
    if (ev.key === "Backspace" || isSingleCharacter) {
      (ev.currentTarget as List).scrollTop = 0;
      this._filterInputField?.focus();
    }
  }

  private _generateCommandItems(): QuickBarItem[] {
    return [...this._generateReloadCommands()].sort((a, b) =>
      compare(a.text.toLowerCase(), b.text.toLowerCase())
    );
  }

  private _generateReloadCommands(): QuickBarItem[] {
    const reloadableDomains = componentsWithService(this.hass, "reload").sort();

    return reloadableDomains.map((domain) => ({
      text:
        this.hass.localize(`ui.dialogs.quick-bar.commands.reload.${domain}`) ||
        this.hass.localize(
          "ui.dialogs.quick-bar.commands.reload.reload",
          "domain",
          domainToName(this.hass.localize, domain)
        ),
      icon: domainIcon(domain),
      action: () => this.hass.callService(domain, "reload"),
    }));
  }

  private _generateEntityItems(): QuickBarItem[] {
    return Object.keys(this.hass.states)
      .map((entityId) => ({
        text: computeStateName(this.hass.states[entityId]) || entityId,
        altText: entityId,
        icon: domainIcon(computeDomain(entityId), this.hass.states[entityId]),
        action: () => fireEvent(this, "hass-more-info", { entityId }),
      }))
      .sort((a, b) => compare(a.text.toLowerCase(), b.text.toLowerCase()));
  }

  private _toggleIfAlreadyOpened() {
    return this._opened ? !this._commandMode : false;
  }

  private _setFilteredItems() {
    const items = this._commandMode ? this._commandItems : this._entityItems;
    this._items = this._filter
      ? this._filterItems(items || [], this._filter)
      : items;
  }

  private _filterItems = memoizeOne(
    (items: QuickBarItem[], filter: string): QuickBarItem[] =>
      fuzzyFilterSort<QuickBarItem>(filter.trimLeft(), items)
  );

  static get styles() {
    return [
      haStyleDialog,
      css`
        .heading {
          padding: 8px 20px 0px;
        }

        ha-dialog {
          --dialog-z-index: 8;
          --dialog-content-padding: 0;
        }

        @media (min-width: 800px) {
          ha-dialog {
            --mdc-dialog-max-width: 800px;
            --mdc-dialog-min-width: 500px;
            --dialog-surface-position: fixed;
            --dialog-surface-top: 40px;
            --mdc-dialog-max-height: calc(100% - 72px);
          }
        }

        ha-svg-icon.prefix {
          margin: 8px;
        }

        .uni-virtualizer-host {
          display: block;
          position: relative;
          contain: strict;
          overflow: auto;
          height: 100%;
        }

        .uni-virtualizer-host > * {
          box-sizing: border-box;
        }

        mwc-list-item {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-quick-bar": QuickBar;
  }
}
