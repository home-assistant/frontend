import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import {
  ComboBoxDataProviderCallback,
  ComboBoxDataProviderParams,
} from "@vaadin/combo-box/vaadin-combo-box-light";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { nextRender } from "../common/util/render-status";
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

const loadIcons = async () => {
  ICONS_LOADED = true;

  const iconList = await import("../../build/mdi/iconList.json");
  ICONS = iconList.default.map((icon) => ({
    icon: `mdi:${icon.name}`,
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
      keywords: icon.keywords ?? [],
    }));
    return customIconItems;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`Unable to load icon list for ${iconsetPrefix} iconset`);
    return [];
  }
};

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

  protected override async scheduleUpdate() {
    await nextRender();
    super.scheduleUpdate();
  }

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        item-value-path="icon"
        item-label-path="icon"
        .value=${this._value}
        allow-custom-value
        .dataProvider=${ICONS_LOADED ? this._iconProvider : undefined}
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
    (filterString: string, iconItems: IconItem[] = ICONS) => {
      if (!filterString) {
        return iconItems;
      }
      const startTime = performance.now();
      const filteredItems = iconItems.filter(
        (item) =>
          item.icon.includes(filterString) ||
          item.keywords.some((word) => word.includes(filterString))
      );
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log(
          'Searched %i icons for "%s" in %s ms with %i results',
          iconItems.length,
          filterString,
          (performance.now() - startTime).toFixed(1),
          filteredItems.length
        );
      }
      return filteredItems;
    }
  );

  private _iconProvider = (
    params: ComboBoxDataProviderParams,
    callback: ComboBoxDataProviderCallback<IconItem>
  ) => {
    const filteredItems = this._filterIcons(params.filter.toLowerCase(), ICONS);
    const iStart = params.page * params.pageSize;
    const iEnd = iStart + params.pageSize;
    callback(filteredItems.slice(iStart, iEnd), filteredItems.length);
  };

  private async _openedChanged(ev: PolymerChangedEvent<boolean>) {
    const opened = ev.detail.value;
    if (opened && !ICONS_LOADED) {
      await loadIcons();
      this.requestUpdate();
    }
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
