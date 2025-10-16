import { mdiMagnify } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import Fuse from "fuse.js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { HaFuse } from "../resources/fuse";
import { haStyleScrollbar } from "../resources/styles";
import { loadVirtualizer } from "../resources/virtualizer";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-combo-box-item";
import "./ha-icon";
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

const DEFAULT_ROW_RENDERER: ComboBoxLitRenderer<PickerComboBoxItem> = (
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
export class HaPickerComboBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property({ attribute: false, type: Array })
  public getItems?: () => PickerComboBoxItem[];

  @property({ attribute: false, type: Array })
  public getAdditionalItems?: (searchString?: string) => PickerComboBoxItem[];

  @property({ attribute: false })
  public rowRenderer?: ComboBoxLitRenderer<PickerComboBoxItem>;

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @property({ attribute: "not-found-label", type: String })
  public notFoundLabel?: string;

  @property({ attribute: false })
  public searchFn?: PickerComboBoxSearchFn<PickerComboBoxItem>;

  @property({ reflect: true }) public mode: "popover" | "dialog" = "popover";

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  public async open() {
    await this.updateComplete;
    await this.comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.comboBox?.focus();
  }

  private _items: PickerComboBoxItemWithLabel[] = [];

  private _defaultNotFoundItem = memoizeOne(
    (
      label: this["notFoundLabel"],
      localize: LocalizeFunc
    ): PickerComboBoxItemWithLabel => ({
      id: NO_MATCHING_ITEMS_FOUND_ID,
      primary: label || localize("ui.components.combo-box.no_match"),
      icon_path: mdiMagnify,
      a11y_label: label || localize("ui.components.combo-box.no_match"),
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
          this.hass.locale.language
        )
      );

    if (!sortedItems.length) {
      sortedItems.push(
        this._defaultNotFoundItem(this.notFoundLabel, this.hass.localize)
      );
    }

    const additionalItems = this._getAdditionalItems();
    sortedItems.push(...additionalItems);
    return sortedItems;
  };

  public willUpdate() {
    if (!this.hasUpdated) {
      loadVirtualizer();
      this._items = this._getItems();
    }
  }

  protected render() {
    return html`<ha-textfield
        .label=${this.hass.localize("ui.common.search")}
        @input=${this._filterChanged}
      ></ha-textfield>
      <lit-virtualizer
        tabindex="0"
        scroller
        .items=${this._items}
        .renderItem=${this.rowRenderer || DEFAULT_ROW_RENDERER}
        class="list"
        style="min-height: 56px;"
        @value-changed=${this._valueChanged}
      >
      </lit-virtualizer> `;
  }

  private get _value() {
    return this.value || "";
  }

  private _valueChanged(ev: ValueChangedEvent<string | undefined>) {
    ev.stopPropagation();
    // Clear the input field to prevent showing the old value next time
    this.comboBox.setTextFieldValue("");
    const newValue = ev.detail.value?.trim();

    if (newValue === NO_MATCHING_ITEMS_FOUND_ID) {
      return;
    }

    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _fuseIndex = memoizeOne((states: PickerComboBoxItem[]) =>
    Fuse.createIndex(["search_labels"], states)
  );

  private _filterChanged = (ev: Event) => {
    const textfield = ev.target as HaTextField;
    const searchString = textfield.value.trim();

    const index = this._fuseIndex(this._items);
    const fuse = new HaFuse(this._items, { shouldSort: false }, index);

    const results = fuse.multiTermsSearch(searchString);
    let filteredItems = this._items as PickerComboBoxItem[];
    if (results) {
      const items = results.map((result) => result.item);
      if (items.length === 0) {
        items.push(
          this._defaultNotFoundItem(this.notFoundLabel, this.hass.localize)
        );
      }
      const additionalItems = this._getAdditionalItems(searchString);
      items.push(...additionalItems);
      filteredItems = items;
    }

    if (this.searchFn) {
      filteredItems = this.searchFn(searchString, filteredItems, this._items);
    }

    // TODO
    this._items = filteredItems as PickerComboBoxItemWithLabel[];
  };

  private _setValue(value: string | undefined) {
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
    }, 0);
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picker-combo-box": HaPickerComboBox;
  }
}
