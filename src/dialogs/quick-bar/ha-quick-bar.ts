import "../../components/ha-circular-progress";
import "../../components/ha-header-bar";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-list/mwc-list";
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
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-dialog";
import { haStyleDialog } from "../../resources/styles";
import {
  fuzzyFilterSort,
  ScorableTextItem,
} from "../../common/string/filter/sequence-matching";
import { HomeAssistant } from "../../types";
import { componentsWithService } from "../../common/config/components_with_service";
import { domainIcon } from "../../common/entity/domain_icon";
import { computeDomain } from "../../common/entity/compute_domain";
import { domainToName } from "../../data/integration";
import { QuickBarParams } from "./show-dialog-quick-bar";
import { compare } from "../../common/string/compare";
import { computeStateName } from "../../common/entity/compute_state_name";
import memoizeOne from "memoize-one";
import "../../common/search/search-input";
import { mdiConsoleLine } from "@mdi/js";
import { scroll } from "lit-virtualizer";
import { styleMap } from "lit-html/directives/style-map";
import { SingleSelectedEvent } from "@material/mwc-list/mwc-list-foundation";

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

  @internalProperty() private _opened = false;

  @internalProperty() private _commandMode = false;

  @internalProperty() private _commandTriggered = -1;

  @internalProperty() private _activatedIndex = 0;

  @query("search-input", false) private _filterInputField?: HTMLElement;

  @query("mwc-list", false) private _list?: HTMLElement;

  public async showDialog(params: QuickBarParams) {
    this._commandMode = params.commandMode || false;
    this._commandItems = this._generateCommandItems();
    this._entityItems = this._generateEntityItems();
    this._opened = true;
  }

  public closeDialog() {
    this._opened = false;
    this._filter = "";
    this._commandTriggered = -1;
    this._items = [];
    this._resetActivatedIndex();
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
          .filter=${this._commandMode ? `>${this._filter}` : this._filter}
          @keydown=${this._handleInputKeyDown}
          @focus=${this._resetActivatedIndex}
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
              activatable
              @selected=${this._handleSelected}
              style=${styleMap({
                height: `${Math.min(this._items.length * 72 + 26, 500)}px`,
              })}
            >
              ${scroll({
                items: this._items as [],
                renderItem: (item: QuickBarItem, index?: number) =>
                  this.renderItem(item, index),
              })}
            </mwc-list>`}
      </ha-dialog>
    `;
  }

  private _handleOpened() {
    this._setFilteredItems();
  }

  private renderItem(item: QuickBarItem, index?: number) {
    return html`
      <mwc-list-item
        .twoline=${Boolean(item.altText)}
        .activated=${index === this._activatedIndex}
        .item=${item}
        .index=${index}
        @keydown=${this._handleListItemKeyDown}
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
        ${this._commandTriggered === index
          ? html`<ha-circular-progress
              size="small"
              active
              slot="meta"
            ></ha-circular-progress>`
          : null}
      </mwc-list-item>
    `;
  }

  private async processItemAndCloseDialog(item: QuickBarItem, index: number) {
    this._commandTriggered = index;

    await item.action();
    this.closeDialog();
  }

  private _resetActivatedIndex() {
    this._activatedIndex = 0;
  }

  private _handleSelected(ev: SingleSelectedEvent) {
    const index = ev.detail.index;
    const item = (ev.target as any).items[index].item;
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
      this._list?.focus();
    }
  }

  private _handleSearchChange(ev: CustomEvent): void {
    const newFilter = ev.detail.value;
    const oldCommandMode = this._commandMode;

    if (newFilter.startsWith(">")) {
      this._commandMode = true;
      this._filter = newFilter.substring(1);
    } else {
      this._commandMode = false;
      this._filter = newFilter;
    }

    if (oldCommandMode !== this._commandMode) {
      this._items = undefined;
    }
  }

  private _handleListItemKeyDown(ev: KeyboardEvent) {
    const isSingleCharacter = ev.key.length === 1;
    const isFirstListItem = (ev.target as any).index === 0;
    if (ev.key === "ArrowUp") {
      if (isFirstListItem) {
        this._filterInputField?.focus();
      } else {
        this._activatedIndex--;
      }
    } else if (ev.key === "ArrowDown") {
      this._activatedIndex++;
    }

    if (ev.key === "Backspace" || isSingleCharacter) {
      this._filterInputField?.focus();
      this._resetActivatedIndex();
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
        text: computeStateName(this.hass.states[entityId]),
        altText: entityId,
        icon: domainIcon(computeDomain(entityId), this.hass.states[entityId]),
        action: () => fireEvent(this, "hass-more-info", { entityId }),
      }))
      .sort((a, b) => compare(a.text.toLowerCase(), b.text.toLowerCase()));
  }

  private async _setFilteredItems() {
    const items = this._commandMode ? this._commandItems : this._entityItems;
    this._items = this._filter
      ? this._filterItems(items || [], this._filter)
      : items;
  }

  private _filterItems = memoizeOne(
    (items: QuickBarItem[], filter: string): QuickBarItem[] => {
      const filteredAndSortedItems = fuzzyFilterSort<QuickBarItem>(
        filter.trimLeft(),
        items
      );
      return filteredAndSortedItems;
    }
  );

  static get styles() {
    return [
      haStyleDialog,
      css`
        .heading {
          padding: 8px 20px 0px;
        }

        mwc-list-item span[slot="secondary"],
        ha-icon[slot="graphic"] {
          color: var(--secondary-text-color);
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

        ha-icon {
          color: var(--secondary-text-color);
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
