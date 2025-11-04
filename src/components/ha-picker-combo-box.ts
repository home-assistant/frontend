import type { LitVirtualizer } from "@lit-labs/virtualizer";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { mdiMagnify } from "@mdi/js";
import Fuse from "fuse.js";
import { css, html, LitElement, nothing } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import memoizeOne from "memoize-one";
import { tinykeys } from "tinykeys";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { HaFuse } from "../resources/fuse";
import { haStyleScrollbar } from "../resources/styles";
import { loadVirtualizer } from "../resources/virtualizer";
import type { HomeAssistant } from "../types";
import "./ha-combo-box-item";
import "./ha-icon";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";

export interface PickerComboBoxItem {
  id: string;
  primary: string;
  a11y_label?: string;
  secondary?: string;
  search_labels?: string[];
  sorting_label?: string;
  icon_path?: string;
  icon?: string;
}

// Hack to force empty label to always display empty value by default in the search field
export interface PickerComboBoxItemWithLabel extends PickerComboBoxItem {
  a11y_label: string;
}

const NO_MATCHING_ITEMS_FOUND_ID = "___no_matching_items_found___";

const DEFAULT_ROW_RENDERER: RenderItemFunction<PickerComboBoxItem> = (
  item
) => html`
  <ha-combo-box-item
    .type=${item.id === NO_MATCHING_ITEMS_FOUND_ID ? "text" : "button"}
    compact
  >
    ${item.icon
      ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
      : item.icon_path
        ? html`<ha-svg-icon slot="start" .path=${item.icon_path}></ha-svg-icon>`
        : nothing}
    <span slot="headline">${item.primary}</span>
    ${item.secondary
      ? html`<span slot="supporting-text">${item.secondary}</span>`
      : nothing}
  </ha-combo-box-item>
`;

export type PickerComboBoxSearchFn<T extends PickerComboBoxItem> = (
  search: string,
  filteredItems: T[],
  allItems: T[]
) => T[];

@customElement("ha-picker-combo-box")
export class HaPickerComboBox extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property() public label?: string;

  @property() public value?: string;

  @state() private _listScrolled = false;

  @property({ attribute: false, type: Array })
  public getItems?: () => PickerComboBoxItem[];

  @property({ attribute: false, type: Array })
  public getAdditionalItems?: (searchString?: string) => PickerComboBoxItem[];

  @property({ attribute: false })
  public rowRenderer?: RenderItemFunction<PickerComboBoxItem>;

  @property({ attribute: "not-found-label", type: String })
  public notFoundLabel?: string;

  @property({ attribute: false })
  public searchFn?: PickerComboBoxSearchFn<PickerComboBoxItem>;

  @property({ reflect: true }) public mode: "popover" | "dialog" = "popover";

  @query("lit-virtualizer") private _virtualizerElement?: LitVirtualizer;

  @query("ha-textfield") private _searchFieldElement?: HaTextField;

  @state() private _items: PickerComboBoxItemWithLabel[] = [];

  private _allItems: PickerComboBoxItemWithLabel[] = [];

  private _selectedItemIndex = -1;

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  private _removeKeyboardShortcuts?: () => void;

  protected firstUpdated() {
    this._registerKeyboardShortcuts();
  }

  public willUpdate() {
    if (!this.hasUpdated) {
      loadVirtualizer();
      this._allItems = this._getItems();
      this._items = this._allItems;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._removeKeyboardShortcuts?.();
  }

  protected render() {
    return html`<ha-textfield
        .label=${this.label ??
        this.hass?.localize("ui.common.search") ??
        "Search"}
        @input=${this._filterChanged}
      ></ha-textfield>
      <lit-virtualizer
        @scroll=${this._onScrollList}
        tabindex="0"
        scroller
        .items=${this._items}
        .renderItem=${this._renderItem}
        style="min-height: 36px;"
        class=${this._listScrolled ? "scrolled" : ""}
        @focus=${this._focusList}
      >
      </lit-virtualizer> `;
  }

  private _defaultNotFoundItem = memoizeOne(
    (
      label: this["notFoundLabel"],
      localize?: LocalizeFunc
    ): PickerComboBoxItemWithLabel => ({
      id: NO_MATCHING_ITEMS_FOUND_ID,
      primary:
        label ||
        (localize && localize("ui.components.combo-box.no_match")) ||
        "No matching items found",
      icon_path: mdiMagnify,
      a11y_label:
        label ||
        (localize && localize("ui.components.combo-box.no_match")) ||
        "No matching items found",
    })
  );

  private _getAdditionalItems = (searchString?: string) => {
    const items = this.getAdditionalItems?.(searchString) || [];

    return items.map<PickerComboBoxItemWithLabel>((item) => ({
      ...item,
      a11y_label: item.a11y_label || item.primary,
    }));
  };

  private _getItems = (): PickerComboBoxItemWithLabel[] => {
    const items = this.getItems ? this.getItems() : [];

    const sortedItems = items
      .map<PickerComboBoxItemWithLabel>((item) => ({
        ...item,
        a11y_label: item.a11y_label || item.primary,
      }))
      .sort((entityA, entityB) =>
        caseInsensitiveStringCompare(
          entityA.sorting_label!,
          entityB.sorting_label!,
          this.hass?.locale.language ?? navigator.language
        )
      );

    if (!sortedItems.length) {
      sortedItems.push(
        this._defaultNotFoundItem(this.notFoundLabel, this.hass?.localize)
      );
    }

    const additionalItems = this._getAdditionalItems();
    sortedItems.push(...additionalItems);
    return sortedItems;
  };

  private _renderItem = (item: PickerComboBoxItem, index: number) => {
    const renderer = this.rowRenderer || DEFAULT_ROW_RENDERER;
    return html`<div
      id=${`list-item-${index}`}
      class="combo-box-row ${this._value === item.id ? "current-value" : ""}"
      .value=${item.id}
      .index=${index}
      @click=${this._valueSelected}
    >
      ${item.id === NO_MATCHING_ITEMS_FOUND_ID
        ? DEFAULT_ROW_RENDERER(item, index)
        : renderer(item, index)}
    </div>`;
  };

  @eventOptions({ passive: true })
  private _onScrollList(ev) {
    const top = ev.target.scrollTop ?? 0;
    this._listScrolled = top > 0;
  }

  private get _value() {
    return this.value || "";
  }

  private _valueSelected = (ev: Event) => {
    ev.stopPropagation();
    const value = (ev.currentTarget as any).value as string;
    const newValue = value?.trim();

    if (newValue === NO_MATCHING_ITEMS_FOUND_ID) {
      return;
    }

    fireEvent(this, "value-changed", { value: newValue });
  };

  private _fuseIndex = memoizeOne((states: PickerComboBoxItem[]) =>
    Fuse.createIndex(["search_labels"], states)
  );

  private _filterChanged = (ev: Event) => {
    const textfield = ev.target as HaTextField;
    const searchString = textfield.value.trim();

    if (!searchString) {
      this._items = this._allItems;
      return;
    }

    const index = this._fuseIndex(this._allItems);
    const fuse = new HaFuse(
      this._allItems,
      {
        shouldSort: false,
        minMatchCharLength: Math.min(searchString.length, 2),
      },
      index
    );

    const results = fuse.multiTermsSearch(searchString);
    let filteredItems = this._allItems as PickerComboBoxItem[];
    if (results) {
      const items = results.map((result) => result.item);
      if (items.length === 0) {
        items.push(
          this._defaultNotFoundItem(this.notFoundLabel, this.hass?.localize)
        );
      }
      const additionalItems = this._getAdditionalItems(searchString);
      items.push(...additionalItems);
      filteredItems = items;
    }

    if (this.searchFn) {
      filteredItems = this.searchFn(
        searchString,
        filteredItems,
        this._allItems
      );
    }

    this._items = filteredItems as PickerComboBoxItemWithLabel[];
    this._selectedItemIndex = -1;
    if (this._virtualizerElement) {
      this._virtualizerElement.scrollTo(0, 0);
    }
  };

  private _registerKeyboardShortcuts() {
    this._removeKeyboardShortcuts = tinykeys(this, {
      ArrowUp: this._selectPreviousItem,
      ArrowDown: this._selectNextItem,
      Home: this._selectFirstItem,
      End: this._selectLastItem,
      Enter: this._pickSelectedItem,
    });
  }

  private _focusList() {
    if (this._selectedItemIndex === -1) {
      this._selectNextItem();
    }
  }

  private _selectNextItem = (ev?: KeyboardEvent) => {
    ev?.stopPropagation();
    ev?.preventDefault();
    if (!this._virtualizerElement) {
      return;
    }

    this._searchFieldElement?.focus();

    const items = this._virtualizerElement.items as PickerComboBoxItem[];

    const maxItems = items.length - 1;

    if (maxItems === -1) {
      this._resetSelectedItem();
      return;
    }

    const nextIndex =
      maxItems === this._selectedItemIndex
        ? this._selectedItemIndex
        : this._selectedItemIndex + 1;

    if (!items[nextIndex]) {
      return;
    }

    if (items[nextIndex].id === NO_MATCHING_ITEMS_FOUND_ID) {
      // Skip titles, padding and empty search
      if (nextIndex === maxItems) {
        return;
      }
      this._selectedItemIndex = nextIndex + 1;
    } else {
      this._selectedItemIndex = nextIndex;
    }

    this._scrollToSelectedItem();
  };

  private _selectPreviousItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    if (!this._virtualizerElement) {
      return;
    }

    if (this._selectedItemIndex > 0) {
      const nextIndex = this._selectedItemIndex - 1;

      const items = this._virtualizerElement.items as PickerComboBoxItem[];

      if (!items[nextIndex]) {
        return;
      }

      if (items[nextIndex]?.id === NO_MATCHING_ITEMS_FOUND_ID) {
        // Skip titles, padding and empty search
        if (nextIndex === 0) {
          return;
        }
        this._selectedItemIndex = nextIndex - 1;
      } else {
        this._selectedItemIndex = nextIndex;
      }

      this._scrollToSelectedItem();
    }
  };

  private _selectFirstItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (!this._virtualizerElement || !this._virtualizerElement.items.length) {
      return;
    }

    const nextIndex = 0;

    if (
      (this._virtualizerElement.items[nextIndex] as PickerComboBoxItem)?.id ===
      NO_MATCHING_ITEMS_FOUND_ID
    ) {
      return;
    }

    if (typeof this._virtualizerElement.items[nextIndex] === "string") {
      this._selectedItemIndex = nextIndex + 1;
    } else {
      this._selectedItemIndex = nextIndex;
    }

    this._scrollToSelectedItem();
  };

  private _selectLastItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (!this._virtualizerElement || !this._virtualizerElement.items.length) {
      return;
    }

    const nextIndex = this._virtualizerElement.items.length - 1;

    if (
      (this._virtualizerElement.items[nextIndex] as PickerComboBoxItem)?.id ===
      NO_MATCHING_ITEMS_FOUND_ID
    ) {
      return;
    }

    if (typeof this._virtualizerElement.items[nextIndex] === "string") {
      this._selectedItemIndex = nextIndex - 1;
    } else {
      this._selectedItemIndex = nextIndex;
    }

    this._scrollToSelectedItem();
  };

  private _scrollToSelectedItem = () => {
    this._virtualizerElement
      ?.querySelector(".selected")
      ?.classList.remove("selected");

    this._virtualizerElement?.scrollToIndex(this._selectedItemIndex, "end");

    requestAnimationFrame(() => {
      this._virtualizerElement
        ?.querySelector(`#list-item-${this._selectedItemIndex}`)
        ?.classList.add("selected");
    });
  };

  private _pickSelectedItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    const firstItem = this._virtualizerElement?.items[0] as PickerComboBoxItem;

    if (
      this._virtualizerElement?.items.length === 1 &&
      firstItem.id !== NO_MATCHING_ITEMS_FOUND_ID
    ) {
      fireEvent(this, "value-changed", {
        value: firstItem.id,
      });
    }

    if (this._selectedItemIndex === -1) {
      return;
    }

    // if filter button is focused
    ev.preventDefault();

    const item = this._virtualizerElement?.items[
      this._selectedItemIndex
    ] as PickerComboBoxItem;
    if (item && item.id !== NO_MATCHING_ITEMS_FOUND_ID) {
      fireEvent(this, "value-changed", { value: item.id });
    }
  };

  private _resetSelectedItem() {
    this._virtualizerElement
      ?.querySelector(".selected")
      ?.classList.remove("selected");
    this._selectedItemIndex = -1;
  }

  static styles = [
    haStyleScrollbar,
    css`
      :host {
        display: flex;
        flex-direction: column;
        padding-top: var(--ha-space-3);
        flex: 1;
      }

      ha-textfield {
        padding: 0 var(--ha-space-3);
        margin-bottom: var(--ha-space-3);
      }

      :host([mode="dialog"]) ha-textfield {
        padding: 0 var(--ha-space-4);
      }

      ha-combo-box-item {
        width: 100%;
      }

      ha-combo-box-item.selected {
        background-color: var(--ha-color-fill-neutral-quiet-hover);
      }

      @media (prefers-color-scheme: dark) {
        ha-combo-box-item.selected {
          background-color: var(--ha-color-fill-neutral-normal-hover);
        }
      }

      lit-virtualizer {
        flex: 1;
      }

      lit-virtualizer:focus-visible {
        outline: none;
      }

      lit-virtualizer.scrolled {
        border-top: 1px solid var(--ha-color-border-neutral-quiet);
      }

      .bottom-padding {
        height: max(var(--safe-area-inset-bottom, 0px), var(--ha-space-8));
        width: 100%;
      }

      .empty {
        text-align: center;
      }

      .combo-box-row {
        display: flex;
        width: 100%;
        align-items: center;
        box-sizing: border-box;
        min-height: 36px;
      }
      .combo-box-row.current-value {
        background-color: var(--ha-color-fill-primary-quiet-resting);
      }

      .combo-box-row.selected {
        background-color: var(--ha-color-fill-neutral-quiet-hover);
      }

      @media (prefers-color-scheme: dark) {
        .combo-box-row.selected {
          background-color: var(--ha-color-fill-neutral-normal-hover);
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picker-combo-box": HaPickerComboBox;
  }
}
