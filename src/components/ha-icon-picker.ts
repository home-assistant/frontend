import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { LocalizeFunc } from "../common/translations/localize";
import { customIcons } from "../data/custom_icons";
import type { ValueChangedEvent } from "../types";
import "./ha-combo-box-item";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import "./ha-icon";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";

interface RankedIcon {
  item: PickerComboBoxItem;
  rank: number;
}

let ICONS: PickerComboBoxItem[] = [];
let ICONS_LOADED = false;

interface IconData {
  name: string;
  keywords?: string[];
}

const createIconItem = (icon: IconData, prefix: string): PickerComboBoxItem => {
  const iconId = `${prefix}:${icon.name}`;
  const iconName = icon.name;
  const parts = iconName.split("-");
  const keywords = icon.keywords ?? [];
  const searchLabels: Record<string, string> = {
    iconName,
  };
  parts.forEach((part, index) => {
    searchLabels[`part${index}`] = part;
  });
  keywords.forEach((keyword, index) => {
    searchLabels[`keyword${index}`] = keyword;
  });
  return {
    id: iconId,
    primary: iconId,
    icon: iconId,
    search_labels: searchLabels,
    sorting_label: iconId,
  };
};

const loadIcons = async () => {
  ICONS_LOADED = true;

  const sortIcons = (icons: PickerComboBoxItem[]) =>
    icons.sort((a, b) => caseInsensitiveStringCompare(a.id, b.id));

  const iconList = await import("../../build/mdi/iconList.json");
  const mdiIcons = iconList.default.map((icon) => createIconItem(icon, "mdi"));
  ICONS = sortIcons([...mdiIcons]);

  const customIconItems = await Promise.all(
    Object.keys(customIcons).map(loadCustomIconItems)
  );
  ICONS = sortIcons([...mdiIcons, ...customIconItems.flat()]);
};

const loadCustomIconItems = async (
  iconsetPrefix: string
): Promise<PickerComboBoxItem[]> => {
  try {
    const getIconList = customIcons[iconsetPrefix].getIconList;
    if (typeof getIconList !== "function") {
      return [];
    }
    const iconList = await getIconList();
    return iconList.map((icon) => createIconItem(icon, iconsetPrefix));
  } catch (_err) {
    // eslint-disable-next-line no-console
    console.warn(`Unable to load icon list for ${iconsetPrefix} iconset`);
    return [];
  }
};

const rowRenderer: RenderItemFunction<PickerComboBoxItem> = (item) => html`
  <ha-combo-box-item>
    <ha-icon .icon=${item.icon ?? item.id} slot="start"></ha-icon>
    ${item.icon ?? item.id}
  </ha-combo-box-item>
`;

@customElement("ha-icon-picker")
export class HaIconPicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean }) public invalid = false;

  @property({ attribute: false }) public suggestedIcons?: string[];

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  private _getIconPickerItems = () =>
    this._itemsWithSuggestions(ICONS, this.suggestedIcons, this._localize);

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("suggestedIcons") || changedProps.has("_localize")) {
      this._picker?.refreshItems();
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-generic-picker
        allow-custom-value
        no-sort
        .pinBlock=${
          this.value && this.suggestedIcons?.includes(this.value)
            ? "nearest"
            : undefined
        }
        .getItems=${this._getIconPickerItems}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .errorMessage=${this.errorMessage}
        .invalid=${this.invalid}
        .rowRenderer=${rowRenderer}
        .icon=${this._icon}
        .label=${this.label}
        .value=${this._value}
        .searchFn=${this._filterIcons}
        @value-changed=${this._valueChanged}
      >
        <slot name="start"></slot>
      </ha-generic-picker>
    `;
  }

  private _itemsWithSuggestions = memoizeOne(
    (
      icons: PickerComboBoxItem[],
      suggestedIcons: string[] | undefined,
      localize: LocalizeFunc
    ): (PickerComboBoxItem | string)[] => {
      if (!suggestedIcons?.length) {
        return icons;
      }
      const suggested = new Set(suggestedIcons);
      return [
        localize("ui.components.icon_picker.suggested"),
        ...suggestedIcons.map((icon) => ({ id: icon, primary: icon, icon })),
        localize("ui.components.icon_picker.all_icons"),
        ...icons.filter((item) => !suggested.has(item.id)),
      ];
    }
  );

  // Filter can take a significant chunk of frame (up to 3-5 ms)
  private _filterIcons = memoizeOne(
    (
      filter: string,
      filteredItems: PickerComboBoxItem[],
      _allItems: PickerComboBoxItem[]
    ): PickerComboBoxItem[] => {
      const normalizedFilter = filter.toLowerCase().replace(/\s+/g, "-");
      // The full list also holds the suggestions and their section titles
      const iconItems = ICONS.length ? ICONS : filteredItems;

      if (!normalizedFilter.length) {
        return iconItems;
      }

      const rankedItems: RankedIcon[] = [];

      // Filter and rank such that exact matches rank higher, and prefer icon name matches over keywords
      for (const item of iconItems) {
        const iconName = (item.id.split(":")[1] || item.id).toLowerCase();
        const parts = iconName.split("-");
        const keywords = item.search_labels
          ? Object.values(item.search_labels)
              .filter((v): v is string => v !== null)
              .map((v) => v.toLowerCase())
          : [];
        const id = item.id.toLowerCase();

        if (parts.includes(normalizedFilter)) {
          rankedItems.push({ item, rank: 1 });
        } else if (keywords.includes(normalizedFilter)) {
          rankedItems.push({ item, rank: 2 });
        } else if (id.includes(normalizedFilter)) {
          rankedItems.push({ item, rank: 3 });
        } else if (keywords.some((word) => word.includes(normalizedFilter))) {
          rankedItems.push({ item, rank: 4 });
        }
      }

      return rankedItems
        .sort((itemA, itemB) => itemA.rank - itemB.rank)
        .map((item) => item.item);
    }
  );

  protected firstUpdated() {
    if (!ICONS_LOADED) {
      loadIcons().then(() => {
        this._picker?.refreshItems();
      });
    }
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    this._setValue(ev.detail.value);
  }

  private _setValue(value: string) {
    this.value = value;
    fireEvent(
      this,
      "value-changed",
      { value: this._value },
      {
        bubbles: false,
        composed: false,
      }
    );
  }

  private get _icon() {
    return this.value?.length ? this.value : this.placeholder;
  }

  private get _value() {
    return this.value || "";
  }

  static styles = css`
    ha-generic-picker {
      width: 100%;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-picker": HaIconPicker;
  }
}
