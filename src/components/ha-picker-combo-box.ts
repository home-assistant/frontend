import { mdiMagnify } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import Fuse from "fuse.js";
import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { HaFuse } from "../resources/fuse";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-combo-box-item";
import "./ha-icon";

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

  @state() private _opened = false;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  public async open() {
    await this.updateComplete;
    await this.comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.comboBox?.focus();
  }

  private _initialItems = false;

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

  protected shouldUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("value") ||
      changedProps.has("label") ||
      changedProps.has("disabled")
    ) {
      return true;
    }
    return !(!changedProps.has("_opened") && this._opened);
  }

  public willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("_opened") && this._opened) {
      this._items = this._getItems();
      if (this._initialItems) {
        this.comboBox.filteredItems = this._items;
      }
      this._initialItems = true;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        item-id-path="id"
        item-value-path="id"
        item-label-path="a11y_label"
        clear-initial-value
        .hass=${this.hass}
        .value=${this._value}
        .label=${this.label}
        .helper=${this.helper}
        .allowCustomValue=${this.allowCustomValue}
        .filteredItems=${this._items}
        .renderer=${this.rowRenderer || DEFAULT_ROW_RENDERER}
        .required=${this.required}
        .disabled=${this.disabled}
        .hideClearIcon=${this.hideClearIcon}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
        @filter-changed=${this._filterChanged}
      >
      </ha-combo-box>
    `;
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    ev.stopPropagation();
    if (ev.detail.value !== this._opened) {
      this._opened = ev.detail.value;
      fireEvent(this, "opened-changed", { value: this._opened });
    }
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

  private _filterChanged(ev: CustomEvent): void {
    if (!this._opened) return;

    const target = ev.target as HaComboBox;
    const searchString = ev.detail.value.trim() as string;

    const index = this._fuseIndex(this._items);
    const fuse = new HaFuse(this._items, { shouldSort: false }, index);

    const results = fuse.multiTermsSearch(searchString);
    if (results) {
      const items = results.map((result) => result.item);
      if (items.length === 0) {
        items.push(
          this._defaultNotFoundItem(this.notFoundLabel, this.hass.localize)
        );
      }
      const additionalItems = this._getAdditionalItems(searchString);
      items.push(...additionalItems);
      target.filteredItems = items;
    } else {
      target.filteredItems = this._items;
    }
  }

  private _setValue(value: string | undefined) {
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picker-combo-box": HaPickerComboBox;
  }
}
