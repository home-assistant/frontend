import Fuse from "fuse.js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { titleCase } from "../common/string/title-case";
import { fetchConfig } from "../data/lovelace/config/types";
import { getPanelIcon, getPanelTitle } from "../data/panel";
import { multiTermSortedSearch } from "../resources/fuseMultiTerm";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import "./ha-generic-picker";
import "./ha-icon";
import {
  DEFAULT_SEARCH_KEYS,
  type PickerComboBoxItem,
} from "./ha-picker-combo-box";

type NavigationGroup = "dashboards" | "views" | "other_routes";

interface NavigationItem extends PickerComboBoxItem {
  group: NavigationGroup;
}

@customElement("ha-navigation-picker")
export class HaNavigationPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() private _loading = true;

  protected firstUpdated() {
    this._loadNavigationItems();
  }

  private _navigationItems: NavigationItem[] = [];

  private _navigationGroups: Record<NavigationGroup, NavigationItem[]> = {
    dashboards: [],
    views: [],
    other_routes: [],
  };

  protected render() {
    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .value=${this._loading ? undefined : this.value}
        allow-custom-value
        .placeholder=${this.label}
        .helper=${this.helper}
        .disabled=${this._loading || this.disabled}
        .required=${this.required}
        .getItems=${this._getItems}
        .valueRenderer=${this._valueRenderer}
        .sections=${[
          {
            id: "dashboards",
            label: this.hass.localize(
              "ui.components.navigation-picker.dashboards"
            ),
          },
          {
            id: "views",
            label: this.hass.localize("ui.components.navigation-picker.views"),
          },
          {
            id: "other_routes",
            label: this.hass.localize(
              "ui.components.navigation-picker.other_routes"
            ),
          },
        ]}
        .customValueLabel=${this.hass.localize(
          "ui.components.navigation-picker.add_custom_path"
        )}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueRenderer = (itemId: string) => {
    const item = this._navigationItems.find((navItem) => navItem.id === itemId);
    return html`
      ${item?.icon
        ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
        : nothing}
      <span slot="headline">${item?.primary || itemId}</span>
      ${item?.primary
        ? html`<span slot="supporting-text">${itemId}</span>`
        : nothing}
    `;
  };

  private _getGroupItems(group: NavigationGroup, searchTerm: string) {
    let items = [...this._navigationGroups[group]].sort(
      this._sortBySortingLabel
    );

    if (searchTerm) {
      items = this._filterGroup(group, items, searchTerm);
    }

    return items;
  }

  private _getItems = (searchString?: string, section?: string) => {
    const searchTerm = (searchString || "").trim();
    const items: (NavigationItem | string)[] = [];

    const dashboards = this._getGroupItems("dashboards", searchTerm);
    const views = this._getGroupItems("views", searchTerm);
    const otherRoutes = this._getGroupItems("other_routes", searchTerm);

    const addGroup = (group: NavigationGroup, groupItems: NavigationItem[]) => {
      if (section && section !== group) {
        return;
      }
      if (!section && groupItems.length) {
        items.push(this.hass.localize(`ui.components.navigation-picker.${group}`));
      }
      items.push(...groupItems);
    };

    addGroup("dashboards", dashboards);
    addGroup("views", views);
    addGroup("other_routes", otherRoutes);

    return items;
  };

  private _fuseIndexes = {
    dashboards: memoizeOne((items: NavigationItem[]) =>
      Fuse.createIndex(DEFAULT_SEARCH_KEYS, items)
    ),
    views: memoizeOne((items: NavigationItem[]) =>
      Fuse.createIndex(DEFAULT_SEARCH_KEYS, items)
    ),
    other_routes: memoizeOne((items: NavigationItem[]) =>
      Fuse.createIndex(DEFAULT_SEARCH_KEYS, items)
    ),
  };

  private _filterGroup(
    group: NavigationGroup,
    items: NavigationItem[],
    searchTerm: string
  ) {
    const fuseIndex = this._fuseIndexes[group](items);

    return multiTermSortedSearch(
      items,
      searchTerm,
      DEFAULT_SEARCH_KEYS,
      (item) => item.id,
      fuseIndex
    );
  }

  private _sortBySortingLabel = (
    itemA: PickerComboBoxItem,
    itemB: PickerComboBoxItem
  ) =>
    caseInsensitiveStringCompare(
      itemA.sorting_label!,
      itemB.sorting_label!,
      this.hass.locale.language
    );

  private async _loadNavigationItems() {
    const panels = Object.entries(this.hass!.panels).map(([id, panel]) => ({
      id,
      ...panel,
    }));
    const lovelacePanels = panels.filter(
      (panel) => panel.component_name === "lovelace"
    );

    const viewConfigs = await Promise.all(
      lovelacePanels.map((panel) =>
        fetchConfig(
          this.hass!.connection,
          // path should be null to fetch default lovelace panel
          panel.url_path === "lovelace" ? null : panel.url_path,
          true
        )
          .then((config) => [panel.id, config] as [string, typeof config])
          .catch((_) => [panel.id, undefined] as [string, undefined])
      )
    );

    const panelViewConfig = new Map(viewConfigs);

    const dashboards: NavigationItem[] = [];
    const views: NavigationItem[] = [];
    const otherRoutes: NavigationItem[] = [];

    for (const panel of panels) {
      const path = `/${panel.url_path}`;
      const panelTitle = getPanelTitle(this.hass, panel);
      const primary = panelTitle || path;
      const panelItem: NavigationItem = {
        id: path,
        primary,
        secondary: panelTitle ? path : undefined,
        icon: getPanelIcon(panel) || "mdi:view-dashboard",
        sorting_label: [
          primary.startsWith("/") ? `zzz${primary}` : primary,
          path,
        ]
          .filter(Boolean)
          .join("_"),
        group:
          panel.component_name === "lovelace" ? "dashboards" : "other_routes",
      };

      if (panel.component_name === "lovelace") {
        dashboards.push(panelItem);
      } else {
        otherRoutes.push(panelItem);
      }

      const config = panelViewConfig.get(panel.id);

      if (!config || !("views" in config)) continue;

      config.views.forEach((view, index) => {
        const viewPath = `/${panel.url_path}/${view.path ?? index}`;
        const viewPrimary =
          view.title ?? (view.path ? titleCase(view.path) : `${index}`);
        views.push({
          id: viewPath,
          secondary: viewPath,
          icon: view.icon ?? "mdi:view-compact",
          primary: viewPrimary,
          sorting_label: [
            viewPrimary.startsWith("/") ? `zzz${viewPrimary}` : viewPrimary,
            viewPath,
          ].join("_"),
          group: "views",
        });
      });
    }

    this._navigationGroups = {
      dashboards,
      views,
      other_routes: otherRoutes,
    };

    this._navigationItems = [...dashboards, ...views, ...otherRoutes];

    this._loading = false;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    this._setValue(ev.detail.value);
  }

  private _setValue(value = "") {
    this.value = value;
    fireEvent(
      this,
      "value-changed",
      { value: this.value },
      {
        bubbles: false,
        composed: false,
      }
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-navigation-picker": HaNavigationPicker;
  }
}
