import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { customIcons } from "../data/custom_icons";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-icon";

type IconItem = {
  icon: string;
  keywords: string[];
};
let iconItems: IconItem[] = [{ icon: "", keywords: [] }];
let iconLoaded = false;

// eslint-disable-next-line lit/prefer-static-styles
const rowRenderer: ComboBoxLitRenderer<IconItem> = (item) => html`<mwc-list-item
  graphic="avatar"
>
  <ha-icon .icon=${item.icon} slot="graphic"></ha-icon>
  ${item.icon}
</mwc-list-item>`;

@customElement("ha-icon-picker")
export class HaIconPicker extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property() public fallbackPath?: string;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean }) public invalid = false;

  @state() private _opened = false;

  @query("ha-combo-box", true) private comboBox!: HaComboBox;

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        item-value-path="icon"
        item-label-path="icon"
        .value=${this._value}
        allow-custom-value
        .filteredItems=${iconItems}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .placeholder=${this.placeholder}
        .errorMessage=${this.errorMessage}
        .invalid=${this.invalid}
        .renderer=${rowRenderer}
        icon
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
        @filter-changed=${this._filterChanged}
      >
        ${this._value || this.placeholder
          ? html`
              <ha-icon .icon=${this._value || this.placeholder} slot="icon">
              </ha-icon>
            `
          : this.fallbackPath
          ? html`<ha-svg-icon
              .path=${this.fallbackPath}
              slot="icon"
            ></ha-svg-icon>`
          : ""}
      </ha-combo-box>
    `;
  }

  private async _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
    if (this._opened && !iconLoaded) {
      const iconList = await import("../../build/mdi/iconList.json");

      iconItems = iconList.default.map((icon) => ({
        icon: `mdi:${icon.name}`,
        keywords: icon.keywords,
      }));
      iconLoaded = true;

      this.comboBox.filteredItems = iconItems;

      Object.keys(customIcons).forEach((iconSet) => {
        this._loadCustomIconItems(iconSet);
      });
    }
  }

  private async _loadCustomIconItems(iconsetPrefix: string) {
    try {
      const getIconList = customIcons[iconsetPrefix].getIconList;
      if (typeof getIconList !== "function") {
        return;
      }
      const iconList = await getIconList();
      const customIconItems = iconList.map((icon) => ({
        icon: `${iconsetPrefix}:${icon.name}`,
        keywords: icon.keywords ?? [],
      }));
      iconItems.push(...customIconItems);
      this.comboBox.filteredItems = iconItems;
    } catch (e) {
      // eslint-disable-next-line
      console.warn(`Unable to load icon list for ${iconsetPrefix} iconset`);
    }
  }

  protected shouldUpdate(changedProps: PropertyValues) {
    return !this._opened || changedProps.has("_opened");
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
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

  private _filterChanged(ev: CustomEvent): void {
    const filterString = ev.detail.value.toLowerCase();
    const characterCount = filterString.length;
    if (characterCount >= 2) {
      const filteredItems: IconItem[] = [];
      const filteredItemsByKeywords: IconItem[] = [];

      iconItems.forEach((item) => {
        if (item.icon.includes(filterString)) {
          filteredItems.push(item);
          return;
        }
        if (item.keywords.some((t) => t.includes(filterString))) {
          filteredItemsByKeywords.push(item);
        }
      });

      filteredItems.push(...filteredItemsByKeywords);

      if (filteredItems.length > 0) {
        this.comboBox.filteredItems = filteredItems;
      } else {
        this.comboBox.filteredItems = [{ icon: filterString, keywords: [] }];
      }
    } else {
      this.comboBox.filteredItems = iconItems;
    }
  }

  private get _value() {
    return this.value || "";
  }

  static get styles() {
    return css`
      ha-icon,
      ha-svg-icon {
        color: var(--primary-text-color);
        position: relative;
        bottom: 2px;
      }
      *[slot="prefix"] {
        margin-right: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-picker": HaIconPicker;
  }
}
