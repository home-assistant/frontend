import "@lit-labs/virtualizer";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import type { ListItem } from "@material/mwc-list/mwc-list-item";
import { mdiClose, mdiMagnify } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { LocalStorage } from "../../common/decorators/local-storage";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { fuzzyFilterSort } from "../../common/string/filter/sequence-matching";
import { debounce } from "../../common/util/debounce";
import "../../components/ha-chip";
import "../../components/ha-circular-progress";
import "../../components/ha-icon-button";
import "../../components/ha-textfield";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../data/area_registry";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
import {
  generateCommandItems,
  generateEntityItems,
  QuickBarItem,
} from "../../data/quick-bar";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import {
  haStyle,
  haStyleDialog,
  haStyleScrollbar,
} from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showConfirmationDialog } from "../generic/show-dialog-box";
import { QuickBarParams } from "./show-dialog-quick-bar";

@customElement("ha-quick-bar")
export class QuickBar extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _items?: Array<QuickBarItem[]>;

  private _filteredItems?: QuickBarItem[];

  @state() private _filter = "";

  @state() private _search = "";

  @state() private _opened = false;

  @state() private _done = false;

  @state() private _narrow = false;

  @state() private _hint?: string;

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _areas?: AreaRegistryEntry[];

  @state() private _devices?: DeviceRegistryEntry[];

  @query("ha-textfield", false) private _filterInputField?: HTMLElement;

  // @ts-ignore
  @LocalStorage("suggestions", true, {
    attribute: false,
  })
  private _suggestions: QuickBarItem[] = [];

  private _focusSet = false;

  private _focusListElement?: ListItem | null;

  private _filterItems = memoizeOne(
    (items: QuickBarItem[], filter: string): QuickBarItem[] =>
      fuzzyFilterSort<QuickBarItem>(filter.trimLeft(), items)
  );

  public async showDialog(params: QuickBarParams) {
    this._hint = params.hint;
    this._narrow = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeAreaRegistry(this.hass.connection!, (areas) => {
        this._areas = areas;
      }),
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._devices = devices;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities;
      }),
    ];
  }

  public closeDialog() {
    this._opened = false;
    this._focusSet = false;
    this._filter = "";
    this._search = "";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (
      (changedProperties.has("_entity") ||
        changedProperties.has("_areas") ||
        changedProperties.has("_devices")) &&
      this._areas &&
      this._devices &&
      this._entities
    ) {
      this._initializeItems();
      this._opened = true;
    }
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }

    let sectionCount = 0;

    if (this._items && this._filter && this._filter !== "") {
      const newFilteredItems: QuickBarItem[] = [];
      this._items.forEach((arr) => {
        const items = this._filterItems(arr, this._filter).slice(0, 3);

        if (items.length === 0) {
          return;
        }

        sectionCount++;
        newFilteredItems.push(...items);
      });

      this._filteredItems = newFilteredItems;
    } else {
      sectionCount++;
      this._filteredItems = this._suggestions;
    }

    return html`
      <ha-dialog
        .heading=${this.hass.localize("ui.dialogs.quick-bar.title")}
        open
        @opened=${this._handleOpened}
        @closed=${this.closeDialog}
        hideActions
      >
        <div slot="heading" class="heading">
          <ha-textfield
            dialogInitialFocus
            .placeholder=${this.hass.localize(
              "ui.dialogs.quick-bar.filter_placeholder"
            )}
            aria-label=${this.hass.localize(
              "ui.dialogs.quick-bar.filter_placeholder"
            )}
            .value=${this._search}
            .icon=${true}
            .iconTrailing=${this._search !== undefined || this._narrow}
            @input=${this._handleSearchChange}
            @keydown=${this._handleInputKeyDown}
            @focus=${this._setFocusFirstListItem}
          >
            <ha-svg-icon
              slot="leadingIcon"
              class="prefix"
              .path=${mdiMagnify}
            ></ha-svg-icon>
            ${this._search || this._narrow
              ? html`
                  <div slot="trailingIcon">
                    ${this._search &&
                    html`<ha-icon-button
                      @click=${this._clearSearch}
                      .label=${this.hass!.localize("ui.common.clear")}
                      .path=${mdiClose}
                    ></ha-icon-button>`}
                    ${this._narrow
                      ? html`
                          <mwc-button
                            .label=${this.hass!.localize("ui.common.close")}
                            @click=${this.closeDialog}
                          ></mwc-button>
                        `
                      : ""}
                  </div>
                `
              : ""}
          </ha-textfield>
        </div>
        ${!this._filteredItems
          ? html`
              <ha-circular-progress size="small" active></ha-circular-progress>
            `
          : this._filteredItems.length === 0 && this._filter !== ""
          ? html`
              <div class="nothing-found">
                ${this.hass.localize("ui.dialogs.quick-bar.nothing_found")}
              </div>
            `
          : html`
              <mwc-list>
                <lit-virtualizer
                  scroller
                  @keydown=${this._handleListItemKeyDown}
                  @rangechange=${this._handleRangeChanged}
                  @click=${this._handleItemClick}
                  class="ha-scrollbar"
                  style=${styleMap({
                    height: this._narrow
                      ? "calc(100vh - 56px)"
                      : `${Math.min(
                          this._filteredItems.length * 72 +
                            sectionCount * 37 +
                            18,
                          this._done ? 600 : 0
                        )}px`,
                  })}
                  .items=${this._filteredItems}
                  .renderItem=${this._renderItem}
                >
                </lit-virtualizer>
              </mwc-list>
            `}
        ${this._hint ? html`<div class="hint">${this._hint}</div>` : ""}
      </ha-dialog>
    `;
  }

  private _renderItem = (item: QuickBarItem, index: number): TemplateResult => {
    if (!item) {
      return html``;
    }

    const previous = this._filteredItems![index - 1];

    return html`
      <div class="entry-container" style="z-index: 5">
        ${index === 0 || item?.categoryKey !== previous?.categoryKey
          ? html`
              <div class="entry-title">
                ${item.isSuggestion
                  ? this.hass.localize(
                      "ui.dialogs.quick-bar.commands.types.suggestions"
                    )
                  : this.hass.localize(
                      `ui.dialogs.quick-bar.commands.types.${item.categoryKey}`
                    )}
              </div>
            `
          : ""}
        <mwc-list-item
          .twoline=${Boolean(item.secondaryText)}
          .hasMeta=${Boolean(item.metaText)}
          .item=${item}
          index=${ifDefined(index)}
          graphic="icon"
          class=${item.secondaryText ? "single-line" : ""}
        >
          ${item.iconPath
            ? html`<ha-svg-icon
                .path=${item.iconPath}
                slot="graphic"
              ></ha-svg-icon>`
            : html`<ha-icon .icon=${item.icon} slot="graphic"></ha-icon>`}
          <span
            >${item.primaryText}
            <span class="secondary">${item.primaryTextAlt}</span></span
          >
          ${item.secondaryText
            ? html`
                <span slot="secondary" class="item-text secondary"
                  >${item.secondaryText}</span
                >
              `
            : ""}
          ${item.metaText
            ? html`<ha-chip slot="meta">${item.metaText}</ha-chip>`
            : ""}
        </mwc-list-item>
      </div>
    `;
  };

  private _initializeItems() {
    const deviceLookup: { [deviceId: string]: DeviceRegistryEntry } = {};
    for (const device of this._devices!) {
      deviceLookup[device.id] = device;
    }

    const entityLookup: { [entityId: string]: EntityRegistryEntry } = {};
    for (const entity of this._entities!) {
      entityLookup[entity.entity_id] = entity;
    }

    const areaLookup: { [areaId: string]: AreaRegistryEntry } = {};
    for (const area of this._areas!) {
      areaLookup[area.area_id] = area;
    }

    this._items = this._items || [
      generateEntityItems(this.hass, entityLookup, deviceLookup, areaLookup),
      ...generateCommandItems(this.hass),
    ];
  }

  private async processItemAndCloseDialog(item: QuickBarItem, index: number) {
    if (!this._suggestions.includes(item)) {
      this._suggestions.unshift({ ...item, isSuggestion: true });
      this._suggestions = this._suggestions.slice(0, 3);
    }

    this._addSpinnerToItem(index);

    switch (item.categoryKey) {
      case "entity":
        fireEvent(this, "hass-more-info", {
          entityId: item.actionData as string,
        });
        break;
      case "reload":
        this.hass.callService(item.actionData[0], item.actionData[1]);
        break;
      case "navigation":
        navigate(item.actionData as string);
        break;
      case "server_control":
        showConfirmationDialog(this, {
          confirmText: this.hass.localize("ui.dialogs.generic.ok"),
          confirm: () =>
            this.hass.callService("homeassistant", item.actionData as string),
        });
        break;
    }
    this.closeDialog();
  }

  private _handleInputKeyDown(ev: KeyboardEvent) {
    if (ev.code === "Enter") {
      const firstItem = this._getItemAtIndex(0);
      if (!firstItem || firstItem.style.display === "none") {
        return;
      }
      this.processItemAndCloseDialog((firstItem as any).item, 0);
    } else if (ev.code === "ArrowDown") {
      ev.preventDefault();
      this._getItemAtIndex(0)?.focus();
      this._focusSet = true;
      this._focusListElement = this._getItemAtIndex(0);
    }
  }

  private _handleSearchChange(ev: CustomEvent): void {
    const newFilter = (ev.currentTarget as any).value;
    let newSearch: string;

    if (newFilter.startsWith(">")) {
      newSearch = newFilter.substring(1);
    } else {
      newSearch = newFilter;
    }

    this._search = newSearch;

    if (this._hint) {
      this._hint = undefined;
    }

    if (this._focusSet && this._focusListElement) {
      this._focusSet = false;
      // @ts-ignore
      this._focusListElement.rippleHandlers.endFocus();
    }
    this._debouncedSetFilter(this._search);
  }

  private _clearSearch() {
    this._search = "";
    this._filter = "";
  }

  private _debouncedSetFilter = debounce((filter: string) => {
    this._filter = filter;
  }, 100);

  private _setFocusFirstListItem() {
    // @ts-ignore
    this._getItemAtIndex(0)?.rippleHandlers.startFocus();
    this._focusListElement = this._getItemAtIndex(0);
  }

  private _handleListItemKeyDown(ev: KeyboardEvent) {
    const isSingleCharacter = ev.key.length === 1;
    const index = (ev.target as HTMLElement).getAttribute("index");
    const isFirstListItem = index === "0";
    this._focusListElement = ev.target as ListItem;
    if (ev.key === "ArrowDown") {
      this._getItemAtIndex(Number(index) + 1)?.focus();
    }
    if (ev.key === "ArrowUp") {
      if (isFirstListItem) {
        this._filterInputField?.focus();
      } else {
        this._getItemAtIndex(Number(index) - 1)?.focus();
      }
    }
    if (ev.key === "Enter" || ev.key === " ") {
      this.processItemAndCloseDialog(
        (ev.target as any).item,
        Number((ev.target as HTMLElement).getAttribute("index"))
      );
    }
    if (ev.key === "Backspace" || isSingleCharacter) {
      (ev.currentTarget as HTMLElement).scrollTop = 0;
      this._filterInputField?.focus();
    }
  }

  private _handleItemClick(ev) {
    const target =
      ev.target.nodeName === "MWC-LIST-ITEM"
        ? ev.target
        : ev.target.parentElement === "MWC-LIST-ITEM"
        ? ev.target.parentElement
        : ev.target.parentElement.parentElement;

    // Need to resolve when clicking on the chip
    if (!target.item) {
      return;
    }

    this.processItemAndCloseDialog(
      target.item,
      Number((target as HTMLElement).getAttribute("index"))
    );
  }

  private _handleOpened() {
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

  private _getItemAtIndex(index: number): ListItem | null {
    return this.renderRoot.querySelector(`mwc-list-item[index="${index}"]`);
  }

  private _addSpinnerToItem(index: number): void {
    const spinner = document.createElement("ha-circular-progress");
    spinner.size = "small";
    spinner.slot = "meta";
    spinner.active = true;
    this._getItemAtIndex(index)?.appendChild(spinner);
  }

  static get styles() {
    return [
      haStyleScrollbar,
      haStyleDialog,
      haStyle,
      css`
        .heading {
          display: flex;
          align-items: center;
        }

        .heading ha-textfield {
          flex-grow: 1;
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

        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-textfield {
            --mdc-shape-small: 0;
          }
        }

        @media all and (max-width: 450px), all and (max-height: 690px) {
          .hint {
            display: none;
          }
        }

        mwc-list-item ha-icon,
        mwc-list-item ha-svg-icon {
          margin-left: 20px;
        }

        ha-svg-icon.prefix {
          color: var(--primary-text-color);
        }

        ha-textfield {
          --mdc-text-field-fill-color: transparent;
          --mdc-theme-primary: var(--divider-color);
          --mdc-text-field-idle-line-color: var(--divider-color);
        }

        ha-textfield ha-icon-button {
          --mdc-icon-button-size: 24px;
          color: var(--primary-text-color);
        }

        .entry-container {
          width: 100%;
        }

        .entry-title {
          padding-left: 16px;
          padding-top: 16px;
          color: var(--secondary-text-color);
        }

        mwc-list-item {
          width: 100%;
          box-sizing: border-box;
        }

        .hint {
          padding: 20px;
          font-style: italic;
          text-align: center;
        }

        .nothing-found {
          padding: 16px 0px;
          text-align: center;
        }

        div[slot="trailingIcon"] {
          display: flex;
          align-items: center;
        }

        lit-virtualizer {
          contain: size layout !important;
        }

        ha-chip {
          margin-left: -48px;
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
