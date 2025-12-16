import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { customIcons } from "../data/custom_icons";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-combo-box-item";
import "./ha-generic-picker";
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

  const iconList = await import("../../build/mdi/iconList.json");
  ICONS = iconList.default.map((icon) => createIconItem(icon, "mdi"));

  const customIconLoads: Promise<PickerComboBoxItem[]>[] = [];
  Object.keys(customIcons).forEach((iconSet) => {
    customIconLoads.push(loadCustomIconItems(iconSet));
  });
  (await Promise.all(customIconLoads)).forEach((customIconItems) => {
    ICONS.push(...customIconItems);
  });
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
  <ha-combo-box-item type="button">
    <ha-icon .icon=${item.id} slot="start"></ha-icon>
    ${item.id}
  </ha-combo-box-item>
`;

@customElement("ha-icon-picker")
export class HaIconPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean }) public invalid = false;

  private _getIconPickerItems = (): PickerComboBoxItem[] => ICONS;

  protected render(): TemplateResult {
    return html`
      <ha-generic-picker
        .hass=${this.hass}
        allow-custom-value
        show-label
        .getItems=${this._getIconPickerItems}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .errorMessage=${this.errorMessage}
        .invalid=${this.invalid}
        .rowRenderer=${rowRenderer}
        .icon=${this._icon}
        .placeholder=${this.label}
        .value=${this._value}
        .searchFn=${this._filterIcons}
        .notFoundLabel=${this.hass?.localize(
          "ui.components.icon-picker.no_match"
        )}
        popover-placement="bottom-start"
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  // Filter can take a significant chunk of frame (up to 3-5 ms)
  private _filterIcons = memoizeOne(
    (
      filter: string,
      filteredItems: PickerComboBoxItem[],
      allItems: PickerComboBoxItem[]
    ): PickerComboBoxItem[] => {
      const normalizedFilter = filter.toLowerCase().replace(/\s+/g, "-");
      const iconItems = allItems?.length ? allItems : filteredItems;

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

      // Allow preview for custom icon not in list
      if (rankedItems.length === 0) {
        rankedItems.push({
          item: {
            id: filter,
            primary: filter,
            icon: filter,
            search_labels: { keyword: filter },
            sorting_label: filter,
          },
          rank: 0,
        });
      }

      return rankedItems
        .sort((itemA, itemB) => itemA.rank - itemB.rank)
        .map((item) => item.item);
    }
  );

  protected firstUpdated() {
    if (!ICONS_LOADED) {
      loadIcons().then(() => {
        this._getIconPickerItems = (): PickerComboBoxItem[] => ICONS;
        this.requestUpdate();
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
