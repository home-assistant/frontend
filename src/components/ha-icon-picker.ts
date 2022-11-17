import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { customIcons } from "../data/custom_icons";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import "./ha-combo-box";
import "./ha-icon";

type IconItem = {
  icon: string;
  keywords: string[];
};
let ICONS: IconItem[] = [];
let ICONS_LOADED = false;

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

  @state() private _filterString = "";

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        item-value-path="icon"
        item-label-path="icon"
        .value=${this._value}
        allow-custom-value
        .filteredItems=${this._filterIcons(this._filterString, ICONS)}
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

  private _filterIcons = memoizeOne(
    (filterString: string, iconItems = ICONS) => {
      if (!filterString) {
        return iconItems;
      }
      const filteredItems: IconItem[] = [];
      const filteredItemsByKeywords: IconItem[] = [];

      iconItems.forEach((item) => {
        if (item.icon.includes(filterString)) {
          filteredItems.push(item);
        }
        if (item.keywords.some((t) => t.includes(filterString))) {
          filteredItemsByKeywords.push(item);
        }
      });
      filteredItems.push(...filteredItemsByKeywords);
      return filteredItems;
    }
  );

  private async _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
    if (this._opened && !ICONS_LOADED) {
      ICONS_LOADED = true;

      // Load icons and update element on first open
      const iconList = await import("../../build/mdi/iconList.json");
      ICONS = iconList.default.map((icon) => ({
        icon: `mdi:${icon.name}`,
        keywords: icon.keywords,
      }));
      this.requestUpdate();

      // Load and add custom icon sets and update again
      const customIconLoads: Promise<IconItem[]>[] = [];
      Object.keys(customIcons).forEach((iconSet) => {
        customIconLoads.push(this._loadCustomIconItems(iconSet));
      });
      (await Promise.all(customIconLoads)).forEach((customIconItems) => {
        ICONS.push(...customIconItems);
      });
      this.requestUpdate();
    }
  }

  private async _loadCustomIconItems(iconsetPrefix: string) {
    try {
      const getIconList = customIcons[iconsetPrefix].getIconList;
      if (typeof getIconList !== "function") {
        return [];
      }
      const iconList = await getIconList();
      const customIconItems = iconList.map((icon) => ({
        icon: `${iconsetPrefix}:${icon.name}`,
        keywords: icon.keywords ?? [],
      }));
      return customIconItems;
    } catch (e) {
      // eslint-disable-next-line
      console.warn(`Unable to load icon list for ${iconsetPrefix} iconset`);
      return [];
    }
  }

  protected shouldUpdate(changedProps: PropertyValues) {
    return (
      !this._opened ||
      changedProps.has("_opened") ||
      changedProps.has("_filterString")
    );
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
    this._filterString = ev.detail.value.toLowerCase();
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
