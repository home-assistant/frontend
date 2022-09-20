import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { titleCase } from "../common/string/title-case";
import {
  fetchConfig,
  fetchDashboards,
  LovelaceViewConfig,
} from "../data/lovelace";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-icon";

type NavigationItem = {
  path: string;
  icon: string;
  title: string;
};

const DEFAULT_ITEMS = [
  {
    path: "/energy",
    icon: "mdi:lightning-bolt",
    title: "Energy",
  },
  {
    path: "/lovelace",
    icon: "mdi:view-dashboard",
    title: "Overview",
  },
];

// eslint-disable-next-line lit/prefer-static-styles
const rowRenderer: ComboBoxLitRenderer<NavigationItem> = (item) => html`
  <mwc-list-item graphic="icon" .twoline=${!!item.title}>
    <ha-icon .icon=${item.icon} slot="graphic"></ha-icon>
    <span>${item.title || item.path}</span>
    <span slot="secondary">${item.path}</span>
  </mwc-list-item>
`;

const createViewNavigationItem = (
  prefix: string,
  view: LovelaceViewConfig,
  index: number
) => ({
  path: `/${prefix}/${view.path ?? index}`,
  icon: view.icon ?? "mdi:view-compact",
  title: view.title ?? (view.path ? titleCase(view.path) : index),
});

@customElement("ha-navigation-picker")
export class HaNavigationPicker extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() private _opened = false;

  private navigationItemsLoaded = false;

  private navigationItems: NavigationItem[] = DEFAULT_ITEMS;

  @query("ha-combo-box", true) private comboBox!: HaComboBox;

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        item-value-path="path"
        item-label-path="path"
        .value=${this._value}
        allow-custom-value
        .filteredItems=${this.navigationItems}
        .label=${this.label}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        .renderer=${rowRenderer}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
        @filter-changed=${this._filterChanged}
      >
      </ha-combo-box>
    `;
  }

  private async _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
    if (this._opened && !this.navigationItemsLoaded) {
      this._loadNavigationItems();
    }
  }

  private async _loadNavigationItems() {
    this.navigationItems = DEFAULT_ITEMS;

    try {
      const overviewConfig = await fetchConfig(
        this.hass!.connection,
        null,
        true
      );
      const viewItems = overviewConfig.views.map<NavigationItem>(
        (view, index) => createViewNavigationItem("lovelace", view, index)
      );
      this.navigationItems = this.navigationItems.concat(viewItems);
    } catch (_) {
      // eslint-disable-next-line no-empty
    }

    const dashboards = await fetchDashboards(this.hass!);

    const viewConfigs = await Promise.all(
      dashboards.map((dashboard) =>
        fetchConfig(this.hass!.connection, dashboard.url_path, true).catch(
          (_) => undefined
        )
      )
    );

    for (const dashboard of dashboards) {
      this.navigationItems.push({
        path: `/${dashboard.url_path}`,
        icon: dashboard.icon ?? "mdi:view-dashboard",
        title: dashboard.title,
      });

      const config = viewConfigs[dashboards.indexOf(dashboard)];

      if (config) {
        const viewItems = config.views.map<NavigationItem>((view, index) =>
          createViewNavigationItem(dashboard.url_path, view, index)
        );
        this.navigationItems = this.navigationItems.concat(viewItems);
      }
    }

    this.navigationItemsLoaded = true;

    this.comboBox.filteredItems = this.navigationItems;
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
      const filteredItems: NavigationItem[] = [];

      this.navigationItems.forEach((item) => {
        if (
          item.path.toLowerCase().includes(filterString) ||
          item.title.toLowerCase().includes(filterString)
        ) {
          filteredItems.push(item);
        }
      });

      if (filteredItems.length > 0) {
        this.comboBox.filteredItems = filteredItems;
      } else {
        this.comboBox.filteredItems = [];
      }
    } else {
      this.comboBox.filteredItems = this.navigationItems;
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
        bottom: 0px;
      }
      *[slot="prefix"] {
        margin-right: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-navigation-picker": HaNavigationPicker;
  }
}
