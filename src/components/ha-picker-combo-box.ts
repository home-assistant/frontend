import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import type { ContextType } from "@lit/context";
import { mdiMagnify, mdiMinusBoxOutline, mdiPlus } from "@mdi/js";
import Fuse from "fuse.js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import {
  customElement,
  eventOptions,
  property,
  query,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { tinykeys } from "tinykeys";
import { consume } from "../common/decorators/consume";
import {
  fireEvent,
  type HASSDomCurrentTargetEvent,
  type HASSDomEvent,
} from "../common/dom/fire_event";
import { ignoreRepeatedActivation } from "../common/keyboard/ignore-repeated-activation";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { internationalizationContext } from "../data/context";
import { ScrollableFadeMixin } from "../mixins/scrollable-fade-mixin";
import {
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../resources/fuseMultiTerm";
import { haStyleScrollbar } from "../resources/styles";
import { loadVirtualizer } from "../resources/virtualizer";
import { isTouch } from "../util/is_touch";
import "./chips/ha-chip-set";
import "./chips/ha-filter-chip";
import "./ha-combo-box-item";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-section-title";
import "./ha-svg-icon";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";
import "./item/ha-list-item-base";
import "./item/ha-list-item-option";
import type { HaListItemOption } from "./item/ha-list-item-option";
import type { HaListBase } from "./list/ha-list-base";
import "./list/ha-list-selectable";
import "./list/ha-list-selectable-virtualized";
import type {
  HaListVirtualized,
  HaListVirtualizedItem,
} from "./list/ha-list-virtualized";
import type { HaListVisibilityChangedDetail } from "./list/types";

export const DEFAULT_SEARCH_KEYS: FuseWeightedKey[] = [
  {
    name: "primary",
    weight: 10,
  },
  {
    name: "secondary",
    weight: 7,
  },
  {
    name: "id",
    weight: 3,
  },
];

export interface PickerComboBoxItem {
  id: string;
  primary: string;
  secondary?: string;
  disabled?: boolean;
  search_labels?: Record<string, string | null>;
  sorting_label?: string;
  icon_path?: string;
  icon?: string;
  isRelated?: boolean;
}

export interface PickerComboBoxIndexSelectedDetail {
  index: number;
  item: PickerComboBoxItem;
  newTab?: boolean;
}

// Under this count the list is rendered without the virtualizer, so it can size the
// popover to its content instead of filling a fixed height.
const MAX_PLAIN_LIST_ITEMS = 12;

export const NO_ITEMS_AVAILABLE_ID = "___no_items_available___";
const PADDING_ID = "___padding___";

/** A row of the virtualized list, wrapping an item or a section title. */
interface PickerComboBoxRow extends HaListVirtualizedItem {
  value: PickerComboBoxItem | string;
}

export const DEFAULT_ROW_RENDERER_CONTENT = (item: PickerComboBoxItem) =>
  html` ${
      item.icon
        ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
        : item.icon_path
          ? html`<ha-svg-icon
              slot="start"
              .path=${item.icon_path}
            ></ha-svg-icon>`
          : nothing
    }
    <span slot="headline">${item.primary}</span>
    ${
      item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing
    }`;

const DEFAULT_ROW_RENDERER: RenderItemFunction<PickerComboBoxItem> = (item) =>
  html`<ha-combo-box-item
    >${DEFAULT_ROW_RENDERER_CONTENT(item)}</ha-combo-box-item
  >`;

export type PickerComboBoxSearchFn<T extends PickerComboBoxItem> = (
  search: string,
  filteredItems: T[],
  allItems: T[]
) => T[];

@customElement("ha-picker-combo-box")
export class HaPickerComboBox extends ScrollableFadeMixin(LitElement) {
  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property({ attribute: "custom-value-label" })
  public customValueLabel?: string;

  @property() public label?: string;

  @property() public value?: string;

  @property({ attribute: false })
  public searchKeys?: FuseWeightedKey[];

  @property({ attribute: false })
  public getItems!: (
    searchString?: string,
    section?: string
  ) => PickerComboBoxItem[] | undefined;

  @property({ attribute: false })
  public getAdditionalItems?: (searchString?: string) => PickerComboBoxItem[];

  @property({ attribute: false })
  public rowRenderer?: RenderItemFunction<PickerComboBoxItem>;

  @property({ attribute: false })
  public notFoundLabel?: string | ((search: string) => string);

  @property({ attribute: "empty-label" })
  public emptyLabel?: string;

  @property({ attribute: false })
  public searchFn?: PickerComboBoxSearchFn<PickerComboBoxItem>;

  @property({ reflect: true }) public mode: "popover" | "dialog" = "popover";

  /**
   * Whether the surface holding the list is done animating in. Defaults to
   * true so direct embedders render immediately; ha-generic-picker sets it
   * once its popover has opened, so the virtualizer never measures rows
   * through the opening animation's scale.
   */
  @property({ type: Boolean }) public shown = true;

  /** Section filter buttons for the list, section headers needs to be defined in getItems as strings */
  @property({ attribute: false }) public sections?: (
    | {
        id: string;
        label: string;
      }
    | "separator"
  )[];

  @property({ attribute: false }) public sectionTitleFunction?: (listInfo: {
    firstIndex: number;
    lastIndex: number;
    firstItem: PickerComboBoxItem | string;
    secondItem: PickerComboBoxItem | string;
    itemsCount: number;
  }) => string | undefined;

  @property({ attribute: "selected-section" }) public selectedSection?: string;

  @property({ type: Boolean, reflect: true }) public clearable = false;

  @property({ type: Boolean, attribute: "no-sort" }) public noSort = false;

  @query(".list") private _list?: HaListBase;

  @query("ha-input-search") private _searchFieldElement?: HaInputSearch;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private i18n?: ContextType<typeof internationalizationContext>;

  @state() private _items: PickerComboBoxItem[] = [];

  @state() private _plainList = false;

  @state() private _selectedSection?: string;

  public setFieldValue(value: string) {
    if (this._searchFieldElement) {
      this._searchFieldElement.value = value;
    }
  }

  protected get scrollableElement(): HTMLElement | null {
    if (this._plainList) {
      return this._list ?? null;
    }
    return (this._list as HaListVirtualized | undefined)?.scrollElement ?? null;
  }

  @state() private _sectionTitle?: string;

  private _allItems: PickerComboBoxItem[] = [];

  // The virtualized list renders its scroller a moment after it connects, so
  // the scroll fades attach once it reports its first visible rows.
  private _virtualScrollElement?: HTMLElement;

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  private _removeKeyboardShortcuts?: () => void;

  private _search = "";

  protected firstUpdated() {
    this._registerKeyboardShortcuts();
  }

  public willUpdate() {
    if (!this.hasUpdated) {
      this._selectedSection = this.selectedSection;
      this._allItems = this._getItems();
      this._items = this._allItems;
      this._updateListMode();
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    // Enter picks the top match while searching, so highlight it whenever the
    // rows change: typing, a section chip, or refreshed items.
    if (changedProps.has("_items") && this._search) {
      this._highlightTopMatch();
    }
  }

  // The list resets its active row when it takes new rows, so wait for that
  // first. Skip if the search was cleared or a key already moved the cursor.
  private async _highlightTopMatch() {
    await this._list?.updateComplete;
    if (this._search && this._list?.getActiveItemIndex() === -1) {
      this._initializeSelectedIndex();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._removeKeyboardShortcuts?.();
  }

  public refreshItems() {
    this._allItems = this._getItems();
    if (!this._search || this.sections?.length) {
      this._items = this._allItems;
    }
    this._updateListMode();
  }

  // Filtering keeps the mode it opened with, only the full list decides it.
  private _updateListMode() {
    this._plainList =
      !this.sections?.length && this._allItems.length <= MAX_PLAIN_LIST_ITEMS;
    if (!this._plainList) {
      loadVirtualizer();
    }
  }

  protected render() {
    const searchLabel =
      this.label ??
      (this.allowCustomValue
        ? (this.i18n?.localize?.("ui.components.combo-box.search_or_custom") ??
          "Search | Add custom value")
        : (this.i18n?.localize?.("ui.common.search") ?? "Search"));

    return html`<ha-input-search
        appearance="outlined"
        .placeholder=${searchLabel}
        @blur=${this._resetSelectedItem}
        @input=${this._filterChanged}
      >
      </ha-input-search>
      ${this._renderSectionButtons()}
      ${
        this.sections?.length
          ? html`
              <div class="section-title-wrapper">
                <div
                  class=${classMap({
                    "section-title": true,
                    show: !this._selectedSection && !!this._sectionTitle,
                  })}
                >
                  ${this._sectionTitle}
                </div>
              </div>
            `
          : nothing
      }
      <div
        class=${classMap({
          "list-wrapper": true,
          virtualized: !this._plainList,
        })}
      >
        ${this._plainList ? this._renderPlainList() : this._renderVirtualList()}
        ${this.renderScrollableFades()}
      </div>`;
  }

  private _renderPlainList() {
    return html`
      <ha-list-selectable
        class=${classMap({
          list: true,
          "plain-list": true,
          scrolled: this._contentScrolled,
        })}
        virtual-focus
        controlled
        tabindex="0"
        @focus=${this._focusList}
        @blur=${this._resetSelectedItem}
      >
        ${repeat(this._items, this._keyFunction, this._renderPlainRow)}
      </ha-list-selectable>
    `;
  }

  private _renderVirtualList() {
    // The virtualizer measures its rows, so it must not do it through the scale
    // the surface animates in with.
    if (!this.shown) {
      return nothing;
    }
    return html`
      <ha-list-selectable-virtualized
        class=${classMap({
          list: true,
          scrolled: this._contentScrolled,
          "with-sections": !!this.sections?.length,
        })}
        virtual-focus
        controlled
        tabindex="0"
        .rows=${this._getRows(this._items)}
        .rowRenderer=${this._getVirtualRowRenderer(
          this.rowRenderer,
          this.value
        )}
        .pinIndex=${this.value ? this._getInitialSelectedIndex() : undefined}
        @focus=${this._focusList}
        @blur=${this._resetSelectedItem}
        @ha-list-visibility-changed=${this._visibilityChanged}
      >
      </ha-list-selectable-virtualized>
    `;
  }

  private _renderSectionButtons() {
    if (!this.sections || this.sections.length === 0) {
      return nothing;
    }

    return html`
      <ha-chip-set class="sections">
        ${this.sections.map((section) =>
          section === "separator"
            ? html`<div class="separator"></div>`
            : html`<ha-filter-chip
                @mousedown=${isTouch ? undefined : this._preventBlur}
                @click=${this._toggleSection}
                .section-id=${section.id}
                .selected=${this._selectedSection === section.id}
                .label=${section.label}
              >
              </ha-filter-chip>`
        )}
      </ha-chip-set>
    `;
  }

  @eventOptions({ passive: true })
  private _visibilityChanged(ev: HASSDomEvent<HaListVisibilityChangedDetail>) {
    const scrollElement = (this._list as HaListVirtualized | undefined)
      ?.scrollElement;
    if (scrollElement !== this._virtualScrollElement) {
      this._virtualScrollElement = scrollElement;
      this.requestUpdate();
    }
    if (this.sectionTitleFunction && this.sections?.length) {
      const { first, last } = ev.detail;
      this._sectionTitle = this.sectionTitleFunction({
        firstIndex: first,
        lastIndex: last,
        firstItem: this._items[first],
        secondItem: this._items[first + 1],
        itemsCount: this._items.length,
      });
    }
  }

  private _getAdditionalItems = (searchString?: string) =>
    this.getAdditionalItems?.(searchString) || [];

  private _getItems = () => {
    let items = [...(this.getItems(this._search, this._selectedSection) || [])];

    if (!this.sections?.length && !this.noSort) {
      items = items.sort((entityA, entityB) => {
        const sortLabelA =
          typeof entityA === "string" ? entityA : entityA.sorting_label;
        const sortLabelB =
          typeof entityB === "string" ? entityB : entityB.sorting_label;

        if (!sortLabelA || !sortLabelB) {
          return 0;
        }

        if (!sortLabelB) {
          return -1;
        }

        if (!sortLabelA) {
          return 1;
        }

        return caseInsensitiveStringCompare(
          sortLabelA,
          sortLabelB,
          this.i18n?.locale?.language ?? navigator.language
        );
      });
    }

    if (!items.length && !this.allowCustomValue) {
      items.push({ id: NO_ITEMS_AVAILABLE_ID, primary: "" });
    }

    const additionalItems = this._getAdditionalItems();
    items.push(...additionalItems);

    if (this.allowCustomValue && this._search) {
      items.push({
        id: this._search,
        primary:
          this.customValueLabel ??
          this.i18n?.localize?.("ui.components.combo-box.add_custom_item") ??
          "Add custom item",
        secondary: `"${this._search}"`,
        icon_path: mdiPlus,
      });
    }

    if (this.mode === "dialog") {
      items.push({ id: PADDING_ID, primary: "" }); // padding for safe area inset
    }

    return items;
  };

  private _isOption = (
    item: PickerComboBoxItem | string | undefined
  ): item is PickerComboBoxItem =>
    !!item &&
    typeof item !== "string" &&
    item.id !== NO_ITEMS_AVAILABLE_ID &&
    item.id !== PADDING_ID;

  // Rows mirror the items one to one, so a list index is an item index.
  private _getRows = memoizeOne(
    (items: (PickerComboBoxItem | string)[]): PickerComboBoxRow[] =>
      items.map((item) =>
        typeof item === "string"
          ? { id: `___title___${item}`, value: item }
          : {
              id: item.id,
              interactive: this._isOption(item),
              disabled: item.disabled,
              value: item,
            }
      )
  );

  // The virtualized list only renders its rows again when the renderer
  // changes, so it gets a new one when what the rows show changes.
  private _getVirtualRowRenderer = memoizeOne(
    (_rowRenderer?: RenderItemFunction<PickerComboBoxItem>, _value?: string) =>
      (row: HaListVirtualizedItem, index: number) =>
        this._renderRow((row as PickerComboBoxRow).value, index)
  );

  // The plain list only tracks list items, so placeholder rows are wrapped in
  // one to keep list indexes equal to item indexes.
  private _renderPlainRow = (item: PickerComboBoxItem, index: number) =>
    this._isOption(item)
      ? this._renderRow(item, index)
      : html`<ha-list-item-base role="presentation" class="static-row">
          <div slot="content">${this._renderRow(item, index)}</div>
        </ha-list-item-base>`;

  private _renderRow(item: PickerComboBoxItem | string, index: number) {
    if (typeof item === "string") {
      return html`<ha-section-title
        style="padding: var(--ha-space-1) var(--ha-space-4);"
        >${item}</ha-section-title
      >`;
    }
    if (item.id === PADDING_ID) {
      return html`<div
        style="height: max(var(--safe-area-inset-bottom, 0px), var(--ha-space-8));"
      ></div>`;
    }
    if (item.id === NO_ITEMS_AVAILABLE_ID) {
      return html`
        <ha-combo-box-item>
          <ha-svg-icon
            slot="start"
            .path=${this._search ? mdiMagnify : mdiMinusBoxOutline}
          ></ha-svg-icon>
          <span slot="headline"
            >${
              this._search
                ? typeof this.notFoundLabel === "function"
                  ? this.notFoundLabel(this._search)
                  : this.notFoundLabel ||
                    this.i18n?.localize?.("ui.components.combo-box.no_match") ||
                    "No matching items found"
                : this.emptyLabel ||
                  this.i18n?.localize?.("ui.components.combo-box.no_items") ||
                  "No items available"
            }</span
          >
        </ha-combo-box-item>
      `;
    }

    const renderer = this.rowRenderer || DEFAULT_ROW_RENDERER;
    return html`<ha-list-item-option
      .value=${item.id}
      .selected=${this.value === item.id}
      .disabled=${!!item.disabled}
      @click=${this._valueSelected}
    >
      <div slot="content">${renderer(item, index)}</div>
    </ha-list-item-option>`;
  }

  private _valueSelected = (
    ev: MouseEvent & HASSDomCurrentTargetEvent<HaListItemOption>
  ) => {
    ev.stopPropagation();
    const { disabled, value } = ev.currentTarget;
    if (disabled) {
      return;
    }
    const index = this._items.findIndex(
      (item) => this._isOption(item) && item.id === value
    );
    if (index === -1) {
      return;
    }
    this._fireSelectedEvents(index, ev.ctrlKey || ev.metaKey);
  };

  private _fireSelectedEvents(index: number, newTab = false) {
    const item = this._items[index];
    fireEvent(this, "value-changed", { value: item.id });
    fireEvent(this, "index-selected", { index, item, newTab });
  }

  private _fuseIndex = memoizeOne(
    (states: PickerComboBoxItem[], searchKeys?: FuseWeightedKey[]) =>
      Fuse.createIndex(searchKeys || DEFAULT_SEARCH_KEYS, states)
  );

  private _filterChanged = (ev: InputEvent) => {
    const textfield = ev.target as HaInputSearch;
    const searchString = (textfield.value ?? "").trim();
    this._search = searchString;

    if (this.sections?.length) {
      this._items = this._getItems();
    } else {
      if (!searchString) {
        this._items = this._allItems;
        this._resetSelectedItem();
        return;
      }

      const index = this._fuseIndex(this._allItems, this.searchKeys);

      let filteredItems = multiTermSortedSearch<PickerComboBoxItem>(
        this._allItems,
        searchString,
        (item) => item.id,
        index
      );

      if (!filteredItems.length && !this.allowCustomValue) {
        filteredItems.push({ id: NO_ITEMS_AVAILABLE_ID, primary: "" });
      }

      const additionalItems = this._getAdditionalItems(searchString);
      filteredItems.push(...additionalItems);

      if (this.searchFn) {
        filteredItems = this.searchFn(
          searchString,
          filteredItems,
          this._allItems
        );
      }

      if (this.allowCustomValue && searchString) {
        filteredItems.push({
          id: searchString,
          primary:
            this.customValueLabel ??
            this.i18n?.localize?.("ui.components.combo-box.add_custom_item") ??
            "Add custom item",
          secondary: `"${searchString}"`,
          icon_path: mdiPlus,
        });
      }

      this._items = filteredItems;
    }

    this._resetSelectedItem();
    this._resetListScroll();
  };

  private _preventBlur(ev: Event) {
    ev.preventDefault();
  }

  private _toggleSection(ev: Event) {
    ev.stopPropagation();
    this._resetSelectedItem();
    this._sectionTitle = undefined;
    const section = (ev.target as HTMLElement)["section-id"] as string;
    if (!section) {
      return;
    }
    if (this._selectedSection === section) {
      this._selectedSection = undefined;
    } else {
      this._selectedSection = section;
    }

    this._items = this._getItems();

    // Reset scroll position when filter changes
    this._resetListScroll();
  }

  private _registerKeyboardShortcuts() {
    this._removeKeyboardShortcuts = tinykeys(
      this,
      {
        ArrowUp: this._selectPreviousItem,
        ArrowDown: this._selectNextItem,
        Home: this._selectFirstItem,
        End: this._selectLastItem,
        PageUp: this._selectPreviousPage,
        PageDown: this._selectNextPage,
        Enter: this._pickSelectedItem,
        "$mod+Enter": this._pickSelectedItemNewTab,
      },
      // Held arrow keys keep moving, like in lists.
      { ignore: ignoreRepeatedActivation }
    );
  }

  private _resetListScroll() {
    if (this._plainList) {
      this._list?.scrollTo({ top: 0 });
      return;
    }
    (this._list as HaListVirtualized | undefined)?.scrollToIndex(0);
  }

  private _focusList() {
    if (this._list?.getActiveItemIndex() === -1) {
      this._initializeSelectedIndex();
    }
  }

  /**
   * Initialize keyboard selection to the currently selected value,
   * or fall back to the first item when searching.
   * Returns whether a row was made active.
   */
  private _initializeSelectedIndex(): boolean {
    if (!this._list || !this._items.length) {
      return false;
    }
    const index = this._getInitialSelectedIndex();
    // Only initialize to first item if searching, otherwise require a selected value
    if (index === 0 && !this._search) {
      return false;
    }
    const item = this._items[index];
    if (!this._search && (!this._isOption(item) || item.disabled)) {
      return false;
    }
    // Skips section titles and placeholder rows, and scrolls the row into view.
    this._list.setActiveItemIndex(index, true);
    return this._list.getActiveItemIndex() !== -1;
  }

  private _selectNextItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    if (!this._list) {
      return;
    }

    this._searchFieldElement?.focus();

    // If no item is selected yet, start from the currently selected value
    if (
      this._list.getActiveItemIndex() === -1 &&
      this._initializeSelectedIndex()
    ) {
      return;
    }

    this._list.moveActiveItem("next");
  };

  private _selectPreviousItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    this._list?.moveActiveItem("previous");
  };

  private _selectFirstItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    this._list?.moveActiveItem("first");
  };

  private _selectLastItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    this._list?.moveActiveItem("last");
  };

  private _selectNextPage = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    this._list?.moveActiveItem("next-page");
  };

  private _selectPreviousPage = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    this._list?.moveActiveItem("previous-page");
  };

  private _pickSelectedItem = (ev: KeyboardEvent) => {
    this._pickItem(ev, false);
  };

  private _pickSelectedItemNewTab = (ev: KeyboardEvent) => {
    this._pickItem(ev, true);
  };

  private _pickItem = (ev: KeyboardEvent, newTab: boolean) => {
    ev.stopPropagation();
    const options = this._items.filter(this._isOption);
    if (options.length === 1) {
      if (!options[0].disabled) {
        this._fireSelectedEvents(this._items.indexOf(options[0]), newTab);
      }
      return;
    }

    if (!this._list) {
      return;
    }

    if (
      this._list.getActiveItemIndex() === -1 &&
      !this._initializeSelectedIndex()
    ) {
      return;
    }

    // if filter button is focused
    ev.preventDefault();

    const index = this._list.getActiveItemIndex();
    const item = this._items[index];
    if (this._isOption(item) && !item.disabled) {
      this._fireSelectedEvents(index, newTab);
    }
  };

  private _resetSelectedItem() {
    this._list?.clearActiveItem();
  }

  private _keyFunction = (item: PickerComboBoxItem | string) =>
    typeof item === "string" ? item : item?.id;

  private _getInitialSelectedIndex() {
    if (this._search || !this.value) {
      return 0;
    }

    const index = this._items.findIndex(
      (item) =>
        typeof item !== "string" &&
        (item as PickerComboBoxItem).id === this.value
    );

    if (index === -1) {
      return 0;
    }

    return index;
  }

  static get styles() {
    return [
      ...super.styles,
      haStyleScrollbar,
      css`
        :host {
          display: flex;
          flex-direction: column;
          padding-top: var(--ha-space-4);
          flex: 1;
          min-height: 0;
        }

        :host([clearable]) {
          --text-field-padding-top: 0;
          --text-field-padding-bottom: 0;
          --text-field-padding-start: var(--ha-space-4);
          --text-field-padding-end: 0;
        }

        ha-input-search {
          padding: 0 var(--ha-space-3) var(--ha-space-3);
        }

        :host([mode="dialog"]) ha-input-search {
          padding: 0 var(--ha-space-4) var(--ha-space-3);
        }

        .list-wrapper {
          position: relative;
          flex: 0 1 auto;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        /* The virtualizer is size contained, so it fills a height rather than
           providing one. Asking for the whole viewport leaves the popover to cap it. */
        .list-wrapper.virtualized {
          flex: 1 1 100vh;
        }

        /* A sheet has its own height, so the list fills it instead of sizing it. */
        :host([mode="dialog"]) .list-wrapper {
          flex: 1;
        }

        .list {
          flex: 1;
          min-height: 0;
          --ha-row-item-padding-block: 0;
          --ha-row-item-padding-inline: 0;
          --ha-row-item-gap: 0;
          --ha-row-item-min-height: 36px;
          --ha-list-item-focus-radius: 0;
          --ha-list-item-selected-background: var(
            --ha-color-fill-primary-quiet-resting
          );
          --ha-list-item-active-background: var(
            --ha-color-fill-neutral-quiet-hover
          );
        }

        @media (prefers-color-scheme: dark) {
          .list {
            --ha-list-item-active-background: var(
              --ha-color-fill-neutral-normal-hover
            );
          }
        }

        .plain-list {
          overflow: auto;
        }

        .list.with-sections {
          --ha-list-scroll-padding-block-start: calc(var(--ha-space-8) + 1px);
        }

        .list:focus-visible {
          outline: none;
        }

        .static-row {
          --ha-row-item-min-height: 0;
        }

        .scrolled {
          border-top: 1px solid var(--ha-color-border-neutral-quiet);
        }

        .sections {
          display: flex;
          flex-shrink: 0;
          flex-wrap: nowrap;
          gap: var(--ha-space-2);
          padding: 0 var(--ha-space-3) var(--ha-space-3);
          overflow: auto;
        }

        :host([mode="dialog"]) .sections {
          padding: 0 var(--ha-space-4) var(--ha-space-3);
        }

        .sections ha-filter-chip {
          flex-shrink: 0;
          --md-filter-chip-selected-container-color: var(
            --ha-color-fill-primary-normal-hover
          );
          color: var(--primary-color);
        }

        .sections .separator {
          height: var(--ha-space-8);
          width: 0;
          border: 1px solid var(--ha-color-border-neutral-quiet);
        }

        .section-title {
          box-sizing: border-box;
          background-color: var(--ha-color-fill-neutral-quiet-resting);
          padding: var(--ha-space-1) var(--ha-space-4);
          font-weight: var(--ha-font-weight-bold);
          color: var(--secondary-text-color);
          min-height: var(--ha-space-6);
          display: flex;
          align-items: center;
        }

        .section-title-wrapper {
          height: 0;
          position: relative;
        }

        .section-title {
          opacity: 0;
          position: absolute;
          top: 1px;
          width: calc(100% - var(--ha-space-4));
        }

        .section-title.show {
          opacity: 1;
          z-index: 1;
        }

        .empty-search {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: center;
          padding: var(--ha-space-3);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picker-combo-box": HaPickerComboBox;
  }

  interface HASSDomEvents {
    "index-selected": PickerComboBoxIndexSelectedDetail;
  }
}
