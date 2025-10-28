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

interface IconItem {
  icon: string;
  parts: Set<string>;
  keywords: string[];
}

interface RankedIcon {
  item: PickerComboBoxItem;
  rank: number;
}

let ICONS: IconItem[] = [];
let ICONS_LOADED = false;

const loadIcons = async () => {
  ICONS_LOADED = true;

  const iconList = await import("../../build/mdi/iconList.json");
  ICONS = iconList.default.map((icon) => ({
    icon: `mdi:${icon.name}`,
    parts: new Set(icon.name.split("-")),
    keywords: icon.keywords,
  }));

  const customIconLoads: Promise<IconItem[]>[] = [];
  Object.keys(customIcons).forEach((iconSet) => {
    customIconLoads.push(loadCustomIconItems(iconSet));
  });
  (await Promise.all(customIconLoads)).forEach((customIconItems) => {
    ICONS.push(...customIconItems);
  });
};

const loadCustomIconItems = async (iconsetPrefix: string) => {
  try {
    const getIconList = customIcons[iconsetPrefix].getIconList;
    if (typeof getIconList !== "function") {
      return [];
    }
    const iconList = await getIconList();
    const customIconItems = iconList.map((icon) => ({
      icon: `${iconsetPrefix}:${icon.name}`,
      parts: new Set(icon.name.split("-")),
      keywords: icon.keywords ?? [],
    }));
    return customIconItems;
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

const valueRenderer = (value: string) => html`
  <ha-icon .icon=${value} slot="start"></ha-icon>
  <span slot="headline">${value}</span>
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

  protected render(): TemplateResult {
    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .value=${this._value}
        allow-custom-value
        .getItems=${this._getItems}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .placeholder=${this.placeholder}
        .rowRenderer=${rowRenderer}
        .valueRenderer=${valueRenderer}
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
    (filter: string, items: PickerComboBoxItem[]): PickerComboBoxItem[] => {
      if (!filter) {
        return items;
      }

      const filteredItems: RankedIcon[] = [];
      const addIcon = (item: PickerComboBoxItem, rank: number) =>
        filteredItems.push({ item, rank });

      // Filter and rank such that exact matches rank higher, and prefer icon name matches over keywords
      for (const item of items) {
        const iconName = item.id.split(":")[1] || item.id;
        const parts = iconName.split("-");
        const keywords = item.search_labels?.slice(1) || [];

        if (parts.includes(filter)) {
          addIcon(item, 1);
        } else if (keywords.includes(filter)) {
          addIcon(item, 2);
        } else if (item.id.includes(filter)) {
          addIcon(item, 3);
        } else if (keywords.some((word) => word.includes(filter))) {
          addIcon(item, 4);
        }
      }

      // Allow preview for custom icon not in list
      if (filteredItems.length === 0) {
        addIcon(
          {
            id: filter,
            primary: filter,
            icon: filter,
            search_labels: [filter],
            sorting_label: filter,
          },
          0
        );
      }

      return filteredItems
        .sort((itemA, itemB) => itemA.rank - itemB.rank)
        .map((item) => item.item);
    }
  );

  private _getItems = (): PickerComboBoxItem[] =>
    ICONS.map((icon: IconItem) => ({
      id: icon.icon,
      primary: icon.icon,
      icon: icon.icon,
      search_labels: [
        icon.icon.split(":")[1] || icon.icon,
        ...Array.from(icon.parts),
        ...icon.keywords,
      ],
      sorting_label: icon.icon,
    }));

  protected firstUpdated() {
    if (!ICONS_LOADED) {
      loadIcons().then(() => {
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
