import type { LitVirtualizer } from "@lit-labs/virtualizer";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { mdiClose, mdiMagnify, mdiMinusBoxOutline, mdiPlus } from "@mdi/js";
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
import { ScrollableFadeMixin } from "../mixins/scrollable-fade-mixin";
import {
  multiTermSortedSearch,
  type FuseWeightedKey,
} from "../resources/fuseMultiTerm";
import { haStyleScrollbar } from "../resources/styles";
import { loadVirtualizer } from "../resources/virtualizer";
import type { HomeAssistant } from "../types";
import "./chips/ha-chip-set";
import "./chips/ha-filter-chip";
import "./ha-combo-box-item";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-svg-icon";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";

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
  search_labels?: Record<string, string | null>;
  sorting_label?: string;
  icon_path?: string;
  icon?: string;
}

export const NO_ITEMS_AVAILABLE_ID = "___no_items_available___";
const PADDING_ID = "___padding___";

const DEFAULT_ROW_RENDERER: RenderItemFunction<PickerComboBoxItem> = (
  item
) => html`
  <ha-combo-box-item type="button" compact>
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
export class HaPickerComboBox extends ScrollableFadeMixin(LitElement) {
  @property({ attribute: false }) public hass?: HomeAssistant;

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

  @property({ attribute: false, type: Array })
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

  @query("lit-virtualizer") public virtualizerElement?: LitVirtualizer;

  @query("ha-textfield") private _searchFieldElement?: HaTextField;

  @state() private _items: PickerComboBoxItem[] = [];

  public setFieldValue(value: string) {
    if (this._searchFieldElement) {
      this._searchFieldElement.value = value;
    }
  }

  protected get scrollableElement(): HTMLElement | null {
    return this.virtualizerElement as HTMLElement | null;
  }

  @state() private _sectionTitle?: string;

  @state() private _valuePinned = true;

  private _allItems: PickerComboBoxItem[] = [];

  private _selectedItemIndex = -1;

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
    const searchLabel =
      this.label ??
      (this.allowCustomValue
        ? (this.hass?.localize("ui.components.combo-box.search_or_custom") ??
          "Search | Add custom value")
        : (this.hass?.localize("ui.common.search") ?? "Search"));

    return html`<ha-textfield
        .label=${searchLabel}
        @blur=${this._resetSelectedItem}
        @input=${this._filterChanged}
        .iconTrailing=${this.clearable && !!this._search}
      >
        <ha-icon-button
          @click=${this._clearSearch}
          slot="trailingIcon"
          .label=${this.hass?.localize("ui.common.clear") || "Clear"}
          .path=${mdiClose}
        ></ha-icon-button>
      </ha-textfield>
      ${this._renderSectionButtons()}
      ${this.sections?.length
        ? html`
            <div class="section-title-wrapper">
              <div
                class="section-title ${!this.selectedSection &&
                this._sectionTitle
                  ? "show"
                  : ""}"
              >
                ${this._sectionTitle}
              </div>
            </div>
          `
        : nothing}
      <div class="virtualizer-wrapper">
        <lit-virtualizer
          .keyFunction=${this._keyFunction}
          tabindex="0"
          scroller
          .items=${this._items}
          .renderItem=${this._renderItem}
          style="min-height: 36px;"
          class=${this._listScrolled ? "scrolled" : ""}
          .layout=${this.value && this._valuePinned
            ? {
                pin: {
                  index: this._getInitialSelectedIndex(),
                  block: "center",
                },
              }
            : undefined}
          @unpinned=${this._handleUnpinned}
          @scroll=${this._onScrollList}
          @focus=${this._focusList}
          @blur=${this._resetSelectedItem}
          @visibilityChanged=${this._visibilityChanged}
        >
        </lit-virtualizer>
        ${this.renderScrollableFades()}
      </div>`;
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
                @click=${this._toggleSection}
                .section-id=${section.id}
                .selected=${this.selectedSection === section.id}
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
    let items = [...(this.getItems(this._search, this.selectedSection) || [])];

    if (!this.sections?.length) {
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
          this.hass?.locale.language ?? navigator.language
        );
      });
    }

    if (!items.length && !this.allowCustomValue) {
      items.push({ id: NO_ITEMS_AVAILABLE_ID, primary: "" });
    }

    const additionalItems = this._getAdditionalItems();
    items.push(...additionalItems);

    if (this.mode === "dialog") {
      items.push({ id: PADDING_ID, primary: "" }); // padding for safe area inset
    }

    return items;
  };

  private _renderItem = (item: PickerComboBoxItem, index: number) => {
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
              >${this._search
                ? typeof this.notFoundLabel === "function"
                  ? this.notFoundLabel(this._search)
                  : this.notFoundLabel ||
                    this.hass?.localize("ui.components.combo-box.no_match") ||
                    "No matching items found"
                : this.emptyLabel ||
                  this.hass?.localize("ui.components.combo-box.no_items") ||
                  "No items available"}</span
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
      class="combo-box-row ${this._value === item.id ? "current-value" : ""}"
      .value=${item.id}
      .index=${index}
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

  private get _value() {
    return this.value || "";
  }

  private _valueSelected = (ev: Event) => {
    ev.stopPropagation();
    const value = (ev.currentTarget as any).value as string;
    const index = Number((ev.currentTarget as any).index);
    const newValue = value?.trim();

    this._fireSelectedEvents(newValue, index);
  };

  private _fireSelectedEvents(value: string, index: number) {
    fireEvent(this, "value-changed", { value });
    fireEvent(this, "index-selected", { index });
  }

  private _clearSearch = () => {
    if (this._searchFieldElement) {
      this._searchFieldElement.value = "";
      this._searchFieldElement.dispatchEvent(new Event("input"));
    }
  };

  private _fuseIndex = memoizeOne(
    (states: PickerComboBoxItem[], searchKeys?: FuseWeightedKey[]) =>
      Fuse.createIndex(searchKeys || DEFAULT_SEARCH_KEYS, states)
  );

  private _filterChanged = (ev: Event) => {
    const textfield = ev.target as HaTextField;
    const searchString = textfield.value.trim();
    this._search = searchString;

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
        this.searchKeys || DEFAULT_SEARCH_KEYS,
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
            this.hass?.localize("ui.components.combo-box.add_custom_item") ??
            "Add custom item",
          secondary: `"${searchString}"`,
          icon_path: mdiPlus,
        });
      }

      this._items = filteredItems;
    }

    this._selectedItemIndex = -1;
    this._valuePinned = true;
  };

  private _toggleSection(ev: Event) {
    ev.stopPropagation();
    this._resetSelectedItem();
    this._sectionTitle = undefined;
    const section = (ev.target as HTMLElement)["section-id"] as string;
    if (!section) {
      return;
    }
    if (this.selectedSection === section) {
      this.selectedSection = undefined;
    } else {
      this.selectedSection = section;
    }

    this._items = this._getItems();

    // Reset scroll position when filter changes
    if (this.virtualizerElement) {
      this.virtualizerElement.scrollToIndex(0);
    }
  }

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
    if (!this.virtualizerElement) {
      return;
    }

    this._searchFieldElement?.focus();

    const items = this.virtualizerElement.items as PickerComboBoxItem[];

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

    if (typeof items[nextIndex] === "string") {
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
    if (!this.virtualizerElement) {
      return;
    }

    if (this._selectedItemIndex > 0) {
      const nextIndex = this._selectedItemIndex - 1;

      const items = this.virtualizerElement.items as PickerComboBoxItem[];

      if (!items[nextIndex]) {
        return;
      }

      if (typeof items[nextIndex] === "string") {
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
    if (!this.virtualizerElement || !this.virtualizerElement.items.length) {
      return;
    }

    const nextIndex = 0;

    if (typeof this.virtualizerElement.items[nextIndex] === "string") {
      this._selectedItemIndex = nextIndex + 1;
    } else {
      this._selectedItemIndex = nextIndex;
    }

    this._scrollToSelectedItem();
  };

  private _selectLastItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (!this.virtualizerElement || !this.virtualizerElement.items.length) {
      return;
    }

    const nextIndex = this.virtualizerElement.items.length - 1;

    if (typeof this.virtualizerElement.items[nextIndex] === "string") {
      this._selectedItemIndex = nextIndex - 1;
    } else {
      this._selectedItemIndex = nextIndex;
    }

    this._scrollToSelectedItem();
  };

  private _scrollToSelectedItem = () => {
    this.virtualizerElement
      ?.querySelector(".selected")
      ?.classList.remove("selected");

    this.virtualizerElement?.scrollToIndex(this._selectedItemIndex, "end");

    requestAnimationFrame(() => {
      this.virtualizerElement
        ?.querySelector(`#list-item-${this._selectedItemIndex}`)
        ?.classList.add("selected");
    });
  };

  private _pickSelectedItem = (ev: KeyboardEvent) => {
    ev.stopPropagation();
    if (
      this.virtualizerElement?.items?.length !== undefined &&
      this.virtualizerElement.items.length < 4 && // it still can have a section title and a padding item
      this.virtualizerElement.items.filter((item) => typeof item !== "string")
        .length === 1
    ) {
      (
        this.virtualizerElement?.items as (PickerComboBoxItem | string)[]
      ).forEach((item, index) => {
        if (typeof item !== "string") {
          this._fireSelectedEvents(item.id, index);
        }
      });
      return;
    }

    if (this._selectedItemIndex === -1) {
      return;
    }

    // if filter button is focused
    ev.preventDefault();

    const item = this.virtualizerElement?.items[
      this._selectedItemIndex
    ] as PickerComboBoxItem;
    if (item) {
      this._fireSelectedEvents(item.id, this._selectedItemIndex);
    }
  };

  private _resetSelectedItem() {
    this.virtualizerElement
      ?.querySelector(".selected")
      ?.classList.remove("selected");
    this._selectedItemIndex = -1;
  }

  private _keyFunction = (item: PickerComboBoxItem | string) =>
    typeof item === "string" ? item : item?.id;

  private _getInitialSelectedIndex() {
    if (!this.virtualizerElement || this._search || !this.value) {
      return 0;
    }

    const index = this.virtualizerElement.items.findIndex(
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
          padding-top: var(--ha-space-3);
          flex: 1;
        }

        :host([clearable]) {
          --text-field-padding: 0 0 0 var(--ha-space-4);
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

        .virtualizer-wrapper {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
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

        .sections {
          display: flex;
          flex-wrap: nowrap;
          gap: var(--ha-space-2);
          padding: var(--ha-space-3) var(--ha-space-3);
          overflow: auto;
        }

        :host([mode="dialog"]) .sections {
          padding: var(--ha-space-3) var(--ha-space-4);
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

        :host([mode="dialog"]) ha-textfield {
          padding: 0 var(--ha-space-4);
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
    "index-selected": { index: number };
  }
}
