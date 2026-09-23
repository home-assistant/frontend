import type { LitVirtualizer } from "@lit-labs/virtualizer";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { consume, type ContextType } from "@lit/context";
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
import memoizeOne from "memoize-one";
import { tinykeys } from "tinykeys";
import { repeat } from "lit/directives/repeat";
import {
  fireEvent,
  type HASSDomCurrentTargetEvent,
} from "../common/dom/fire_event";
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
import "./ha-svg-icon";
import "./input/ha-input-search";
import type { HaInputSearch } from "./input/ha-input-search";

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
  newTab?: boolean;
}

type PickerComboBoxRowElement = HTMLDivElement & {
  disabled?: boolean;
  index: number;
  value: string;
};

// Under this count the list is rendered without the virtualizer, so it can size the
// popover to its content instead of filling a fixed height.
const MAX_PLAIN_LIST_ITEMS = 12;

export const NO_ITEMS_AVAILABLE_ID = "___no_items_available___";
export const PADDING_ID = "___padding___";

/**
 * Whether Enter on this row would pick something. Section titles are plain
 * strings, and the padding and empty-list rows are placeholders, so the
 * keyboard cursor skips all of them.
 */
export const isPickableItem = (
  item?: PickerComboBoxItem | string
): item is PickerComboBoxItem =>
  !!item &&
  typeof item !== "string" &&
  !item.disabled &&
  item.id !== NO_ITEMS_AVAILABLE_ID &&
  item.id !== PADDING_ID;

/** Nearest pickable row from `from`, moving by `step`. -1 when there is none. */
export const findPickableIndex = (
  items: (PickerComboBoxItem | string)[],
  from: number,
  step: 1 | -1
): number => {
  for (let i = from; i >= 0 && i < items.length; i += step) {
    if (isPickableItem(items[i])) {
      return i;
    }
  }
  return -1;
};

/**
 * Where the cursor sits before the user moves it, or -1 when Enter should do
 * nothing. An untouched list without a value has no cursor: Enter is only ever
 * a shortcut for a row the user has already narrowed to or picked.
 */
export const defaultSelectedIndex = (
  items: (PickerComboBoxItem | string)[],
  search: string,
  value?: string
): number => {
  // A search narrows the list to what was asked for, so Enter takes the top
  // match.
  if (search) {
    return findPickableIndex(items, 0, 1);
  }
  if (value) {
    return items.findIndex((item) => isPickableItem(item) && item.id === value);
  }
  return -1;
};

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
  html`<ha-combo-box-item type="button" compact>
    ${DEFAULT_ROW_RENDERER_CONTENT(item)}
  </ha-combo-box-item>`;

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

  @state() private _listScrolled = false;

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

  @query("lit-virtualizer") public virtualizerElement?: LitVirtualizer;

  @query(".plain-list") private _plainListElement?: HTMLElement;

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
    return this._listElement ?? null;
  }

  private get _listElement(): HTMLElement | undefined {
    return this._plainList ? this._plainListElement : this.virtualizerElement;
  }

  @state() private _sectionTitle?: string;

  @state() private _valuePinned = true;

  private _allItems: PickerComboBoxItem[] = [];

  /**
   * The row Enter picks, or -1 when Enter does nothing. The highlight renders
   * from this, so the cursor and Enter cannot disagree.
   */
  @state() private _selectedItemIndex = -1;

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  private _removeKeyboardShortcuts?: () => void;

  private _search = "";

  private _cursorScrollPending = false;

  protected firstUpdated() {
    this._registerKeyboardShortcuts();
  }

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this._selectedSection = this.selectedSection;
      this._allItems = this._getItems();
      this._items = this._allItems;
      this._updateListMode();
    }
    if (changedProps.has("_items") || changedProps.has("value")) {
      this._selectedItemIndex = this._focusOwnsCursor
        ? this._defaultSelectedIndex()
        : -1;
    }
  }

  protected updated() {
    if (!this._cursorScrollPending) {
      return;
    }
    this._cursorScrollPending = false;
    if (this._selectedItemIndex === -1) {
      this._resetListScroll();
      return;
    }
    this._scrollRowIntoView(this._selectedItemIndex);
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
        @focus=${this._restoreCursor}
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
                  class="section-title ${
                    !this._selectedSection && this._sectionTitle ? "show" : ""
                  }"
                >
                  ${this._sectionTitle}
                </div>
              </div>
            `
          : nothing
      }
      <div class="list-wrapper ${this._plainList ? "" : "virtualized"}">
        ${this._plainList ? this._renderPlainList() : this._renderVirtualList()}
        ${this.renderScrollableFades()}
      </div>`;
  }

  private _renderPlainList() {
    return html`
      <div
        class="plain-list ${this._listScrolled ? "scrolled" : ""}"
        tabindex="0"
        @scroll=${this._onScrollList}
        @focus=${this._restoreCursor}
        @blur=${this._resetSelectedItem}
      >
        ${repeat(
          this._items,
          this._keyFunction,
          this._rowRenderer(this._selectedItemIndex, this.value)
        )}
      </div>
    `;
  }

  private _renderVirtualList() {
    // The virtualizer measures its rows, so it must not do it through the scale
    // the surface animates in with.
    if (!this.shown) {
      return nothing;
    }
    return html`
      <lit-virtualizer
        .keyFunction=${this._keyFunction}
        tabindex="0"
        scroller
        .items=${this._items}
        .renderItem=${this._rowRenderer(this._selectedItemIndex, this.value)}
        style="min-height: 36px;"
        class=${this._listScrolled ? "scrolled" : ""}
        .layout=${
          this.value && this._valuePinned
            ? {
                pin: {
                  index: this._getInitialSelectedIndex(),
                  block: "center",
                },
              }
            : undefined
        }
        @unpinned=${this._handleUnpinned}
        @scroll=${this._onScrollList}
        @focus=${this._restoreCursor}
        @blur=${this._resetSelectedItem}
        @visibilityChanged=${this._visibilityChanged}
      >
      </lit-virtualizer>
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
  private _visibilityChanged(ev) {
    if (
      this.virtualizerElement &&
      this.sectionTitleFunction &&
      this.sections?.length
    ) {
      const firstItem = this.virtualizerElement.items[ev.first];
      const secondItem = this.virtualizerElement.items[ev.first + 1];
      this._sectionTitle = this.sectionTitleFunction({
        firstIndex: ev.first,
        lastIndex: ev.last,
        firstItem: firstItem as PickerComboBoxItem,
        secondItem: secondItem as PickerComboBoxItem,
        itemsCount: this.virtualizerElement.items.length,
      });
    }
  }

  @eventOptions({ passive: true })
  private _handleUnpinned() {
    this._valuePinned = false;
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

  /**
   * lit-virtualizer only re-renders its rows when one of its own properties
   * changes, so anything the rows read off the host has to travel with the
   * renderer's identity.
   */
  private _rowRenderer = memoizeOne(
    (selectedIndex: number, _value?: string) =>
      (item: PickerComboBoxItem, index: number) =>
        this._renderItem(item, index, index === selectedIndex)
  );

  private _renderItem = (
    item: PickerComboBoxItem,
    index: number,
    selected: boolean
  ) => {
    if (!item) {
      return nothing;
    }
    if (item.id === PADDING_ID) {
      return html`<div class="bottom-padding"></div>`;
    }
    if (item.id === NO_ITEMS_AVAILABLE_ID) {
      return html`
        <div class="combo-box-row">
          <ha-combo-box-item type="text" compact>
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
                      this.i18n?.localize?.(
                        "ui.components.combo-box.no_match"
                      ) ||
                      "No matching items found"
                  : this.emptyLabel ||
                    this.i18n?.localize?.("ui.components.combo-box.no_items") ||
                    "No items available"
              }</span
            >
          </ha-combo-box-item>
        </div>
      `;
    }
    if (typeof item === "string") {
      return html`<div class="title">${item}</div>`;
    }

    const renderer = this.rowRenderer || DEFAULT_ROW_RENDERER;
    return html`<div
      id=${`list-item-${index}`}
      class="combo-box-row ${this.value === item.id ? "current-value" : ""} ${
        selected ? "selected" : ""
      }"
      .value=${item.id}
      .index=${index}
      .disabled=${item.disabled}
      @click=${this._valueSelected}
    >
      ${renderer(item, index)}
    </div>`;
  };

  @eventOptions({ passive: true })
  private _onScrollList(ev) {
    const top = ev.target.scrollTop ?? 0;
    this._listScrolled = top > 0;
  }

  private _valueSelected = (
    ev: MouseEvent & HASSDomCurrentTargetEvent<PickerComboBoxRowElement>
  ) => {
    ev.stopPropagation();
    const { disabled, index, value } = ev.currentTarget;
    if (disabled) {
      return;
    }
    const newTab = ev.ctrlKey || ev.metaKey;

    this._fireSelectedEvents(value, index, newTab);
  };

  private _fireSelectedEvents(value: string, index: number, newTab = false) {
    fireEvent(this, "value-changed", { value });
    fireEvent(this, "index-selected", { index, newTab });
  }

  private _fuseIndex = memoizeOne(
    (states: PickerComboBoxItem[], searchKeys?: FuseWeightedKey[]) =>
      Fuse.createIndex(searchKeys || DEFAULT_SEARCH_KEYS, states)
  );

  private _filterChanged = (ev: InputEvent) => {
    const textfield = ev.target as HaInputSearch;
    const searchString = (textfield.value ?? "").trim();
    this._search = searchString;
    this._valuePinned = true;
    // Filtering reseeds the cursor onto the first match, but an already
    // scrolled list stays where it is, so that row can be off screen. Put it
    // back in view once the filtered items have rendered.
    this._cursorScrollPending = true;

    if (this.sections?.length) {
      this._items = this._getItems();
    } else {
      if (!searchString) {
        this._items = this._allItems;
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
  };

  private _preventBlur(ev: Event) {
    ev.preventDefault();
  }

  private _toggleSection(ev: Event) {
    ev.stopPropagation();
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

  /**
   * The shortcuts are bound to the host, so they arrive wherever focus sits
   * inside the picker. The navigation keys move the cursor without moving
   * focus, so off the search field and the list they would highlight a row
   * that Enter refuses to pick. A section chip keeps its own keys.
   *
   * Enter guards inside `_pickItem` instead, which stops propagation before it
   * bails.
   */
  private _cursorKey =
    (handler: (ev: KeyboardEvent) => void) => (ev: KeyboardEvent) => {
      if (!this._focusOwnsCursor) {
        return;
      }
      handler(ev);
    };

  private _registerKeyboardShortcuts() {
    this._removeKeyboardShortcuts = tinykeys(this, {
      ArrowUp: this._cursorKey(this._selectPreviousItem),
      ArrowDown: this._cursorKey(this._selectNextItem),
      Home: this._cursorKey(this._selectFirstItem),
      End: this._cursorKey(this._selectLastItem),
      Enter: this._pickSelectedItem,
      "$mod+Enter": this._pickSelectedItemNewTab,
    });
  }

  private _resetListScroll() {
    if (this._plainList) {
      this._listElement?.scrollTo({ top: 0 });
      return;
    }
    this.virtualizerElement?.element(0)?.scrollIntoView();
  }

  private _scrollRowIntoView(index: number) {
    if (this._plainList) {
      this._listElement
        ?.querySelector(`#list-item-${index}`)
        ?.scrollIntoView({ block: "nearest" });
      return;
    }
    this.virtualizerElement?.element(index)?.scrollIntoView({
      block: "nearest",
    });
  }

  /**
   * The search field and the list are the only places Enter reaches the cursor
   * from, so the cursor exists only while one of them has focus. Anywhere else
   * inside the picker — a section chip — the highlight would promise a pick
   * that Enter will not make.
   */
  private get _focusOwnsCursor(): boolean {
    const focused = this.shadowRoot?.activeElement;
    return (
      !!focused &&
      (focused === this._searchFieldElement || focused === this._listElement)
    );
  }

  /**
   * The blur handlers drop the cursor, so whichever of the search field and the
   * list takes focus next puts it back. Enter acts on the cursor, and the row
   * it points at is highlighted, so both have to survive focus moving between
   * the two.
   */
  private _restoreCursor() {
    if (this._selectedItemIndex === -1) {
      this._selectedItemIndex = this._defaultSelectedIndex();
    }
  }

  private _defaultSelectedIndex(): number {
    return defaultSelectedIndex(this._items, this._search, this.value);
  }

  private _moveCursor(from: number, step: 1 | -1) {
    const index = findPickableIndex(this._items, from, step);
    if (index === -1) {
      return;
    }
    this._selectedItemIndex = index;
    this._scrollRowIntoView(index);
  }

  private _selectNextItem = (ev?: KeyboardEvent) => {
    ev?.stopPropagation();
    ev?.preventDefault();
    if (!this._listElement) {
      return;
    }

    // Focusing the search field blurs the list, which resets the cursor, so
    // read the starting index first.
    const from = this._selectedItemIndex + 1;

    this._searchFieldElement?.focus();

    this._moveCursor(from, 1);
  };

  private _selectPreviousItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
    if (!this._listElement || this._selectedItemIndex <= 0) {
      return;
    }

    this._moveCursor(this._selectedItemIndex - 1, -1);
  };

  private _selectFirstItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (!this._listElement) {
      return;
    }

    this._moveCursor(0, 1);
  };

  private _selectLastItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (!this._listElement) {
      return;
    }

    this._moveCursor(this._items.length - 1, -1);
  };

  private _pickSelectedItem = (ev: KeyboardEvent) => {
    this._pickItem(ev, false);
  };

  private _pickSelectedItemNewTab = (ev: KeyboardEvent) => {
    this._pickItem(ev, true);
  };

  private _pickItem = (ev: KeyboardEvent, newTab: boolean) => {
    ev.stopPropagation();

    // Enter is bound to the host, so it arrives wherever focus sits inside the
    // picker. A focused section chip needs its own Enter to toggle its section.
    if (!this._focusOwnsCursor) {
      return;
    }

    const item = this._items[this._selectedItemIndex];
    if (this._selectedItemIndex === -1 || !isPickableItem(item)) {
      return;
    }

    ev.preventDefault();

    this._fireSelectedEvents(item.id, this._selectedItemIndex, newTab);
  };

  private _resetSelectedItem() {
    this._selectedItemIndex = -1;
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

        ha-combo-box-item {
          width: 100%;
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

        lit-virtualizer,
        .plain-list {
          flex: 1;
          min-height: 0;
        }

        .plain-list {
          overflow: auto;
        }

        lit-virtualizer:focus-visible,
        .plain-list:focus-visible {
          outline: none;
        }

        .scrolled {
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

        .combo-box-row.current-value.selected {
          background-color: var(--ha-color-fill-primary-quiet-hover);
        }

        @media (prefers-color-scheme: dark) {
          .combo-box-row.selected {
            background-color: var(--ha-color-fill-neutral-normal-hover);
          }
        }

        .sections {
          display: flex;
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

        .section-title,
        .title {
          box-sizing: border-box;
          background-color: var(--ha-color-fill-neutral-quiet-resting);
          padding: var(--ha-space-1) var(--ha-space-4);
          font-weight: var(--ha-font-weight-bold);
          color: var(--secondary-text-color);
          min-height: var(--ha-space-6);
          display: flex;
          align-items: center;
        }

        .title {
          width: 100%;
        }

        :host([mode="dialog"]) .title {
          padding: var(--ha-space-1) var(--ha-space-4);
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
