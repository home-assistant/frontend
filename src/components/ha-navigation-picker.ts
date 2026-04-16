import Fuse from "fuse.js";
import { mdiPuzzle } from "@mdi/js";
import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { getConfigEntries, type ConfigEntry } from "../data/config_entries";
import {
  getIngressPanelInfoCollection,
  type IngressPanelInfo,
} from "../data/hassio/ingress";
import { fetchConfig } from "../data/lovelace/config/types";
import { SYSTEM_PANELS } from "../data/panel";
import { computeNavigationPathInfo } from "../data/compute-navigation-path-info";
import { findRelated, type RelatedResult } from "../data/search";
import { PANEL_DASHBOARDS } from "../panels/config/lovelace/dashboards/ha-config-lovelace-dashboards";
import { computeAreaPath } from "../panels/lovelace/strategies/areas/helpers/areas-strategy-helper";
import { multiTermSortedSearch } from "../resources/fuseMultiTerm";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import type { ActionRelatedContext } from "../panels/lovelace/components/hui-action-editor";
import "./ha-generic-picker";
import "./ha-domain-icon";
import "./ha-icon";
import {
  DEFAULT_SEARCH_KEYS,
  type PickerComboBoxItem,
} from "./ha-picker-combo-box";

type NavigationGroup =
  | "related"
  | "dashboards"
  | "views"
  | "apps"
  | "other_routes";

const RELATED_SORT_PREFIX = {
  area_view: "0_area_view",
  area: "1_area_settings",
  device: "2_device",
} as const;

const createSortingLabel = (...parts: (string | undefined)[]) =>
  parts
    .filter(Boolean)
    .map((part) => (part!.startsWith("/") ? `zzz${part}` : part))
    .join("_");

interface NavigationItem extends PickerComboBoxItem {
  group: NavigationGroup;
  domain?: string;
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

  @property({ attribute: false }) public context?: ActionRelatedContext;

  protected firstUpdated() {
    this._loadNavigationItems();
  }

  private _navigationItems: NavigationItem[] = [];

  private _configEntryLookup: Record<string, ConfigEntry> = {};

  private _navigationGroups: Record<NavigationGroup, NavigationItem[]> = {
    related: [],
    dashboards: [],
    views: [],
    apps: [],
    other_routes: [],
  };

  private _getRelatedItems = memoizeOne(
    async (_cacheKey: string, context: ActionRelatedContext) =>
      this._fetchRelatedItems(context),
    (newArgs, lastArgs) => newArgs[0] === lastArgs[0]
  );

  protected render() {
    const sections = [
      ...(this._navigationGroups.related.length
        ? [
            {
              id: "related",
              label: this.hass.localize(
                "ui.components.navigation-picker.related"
              ),
            },
          ]
        : []),
      {
        id: "dashboards",
        label: this.hass.localize("ui.components.navigation-picker.dashboards"),
      },
      {
        id: "views",
        label: this.hass.localize("ui.components.navigation-picker.views"),
      },
      ...(this._navigationGroups.apps.length
        ? [
            {
              id: "apps",
              label: this.hass.localize("ui.components.navigation-picker.apps"),
            },
          ]
        : []),
      {
        id: "other_routes",
        label: this.hass.localize(
          "ui.components.navigation-picker.other_routes"
        ),
      },
    ];

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
        .rowRenderer=${this._rowRenderer}
        .sections=${sections}
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
      ${item?.domain
        ? html`
            <ha-domain-icon
              slot="start"
              .domain=${item.domain}
              brand-fallback
            ></ha-domain-icon>
          `
        : item?.icon
          ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
          : item?.icon_path
            ? html`<ha-svg-icon
                slot="start"
                .path=${item.icon_path}
              ></ha-svg-icon>`
            : nothing}
      <span slot="headline">${item?.primary || itemId}</span>
      ${item?.primary
        ? html`<span slot="supporting-text">${itemId}</span>`
        : nothing}
    `;
  };

  private _rowRenderer = (item: NavigationItem) => html`
    <ha-combo-box-item type="button" compact>
      ${item.domain
        ? html`
            <ha-domain-icon
              slot="start"
              .domain=${item.domain}
              brand-fallback
            ></ha-domain-icon>
          `
        : item.icon
          ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
          : item.icon_path
            ? html`<ha-svg-icon
                slot="start"
                .path=${item.icon_path}
              ></ha-svg-icon>`
            : nothing}
      <span slot="headline">${item.primary}</span>
      ${item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing}
    </ha-combo-box-item>
  `;

  private _fuseIndexes = {
    related: memoizeOne((items: NavigationItem[]) =>
      Fuse.createIndex(DEFAULT_SEARCH_KEYS, items)
    ),
    dashboards: memoizeOne((items: NavigationItem[]) =>
      Fuse.createIndex(DEFAULT_SEARCH_KEYS, items)
    ),
    views: memoizeOne((items: NavigationItem[]) =>
      Fuse.createIndex(DEFAULT_SEARCH_KEYS, items)
    ),
    apps: memoizeOne((items: NavigationItem[]) =>
      Fuse.createIndex(DEFAULT_SEARCH_KEYS, items)
    ),
    other_routes: memoizeOne((items: NavigationItem[]) =>
      Fuse.createIndex(DEFAULT_SEARCH_KEYS, items)
    ),
  };

  private _getItems = (searchString?: string, section?: string) => {
    const getGroupItems = (group: NavigationGroup) => {
      let items = [...this._navigationGroups[group]].sort(
        this._sortBySortingLabel
      );

      if (searchString) {
        const fuseIndex = this._fuseIndexes[group](items);
        items = multiTermSortedSearch(
          items,
          searchString,
          DEFAULT_SEARCH_KEYS,
          (item) => item.id,
          fuseIndex
        );
      }

      return items;
    };

    const items: (NavigationItem | string)[] = [];

    const related = getGroupItems("related");
    const dashboards = getGroupItems("dashboards");
    const views = getGroupItems("views");
    const apps = getGroupItems("apps");
    const otherRoutes = getGroupItems("other_routes");

    const addGroup = (group: NavigationGroup, groupItems: NavigationItem[]) => {
      if (section && section !== group) {
        return;
      }
      if (!section && groupItems.length) {
        items.push(
          this.hass.localize(`ui.components.navigation-picker.${group}`)
        );
      }
      items.push(...groupItems);
    };

    addGroup("related", related);
    addGroup("dashboards", dashboards);
    addGroup("views", views);
    addGroup("apps", apps);
    addGroup("other_routes", otherRoutes);

    return items;
  };

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
    await this._loadConfigEntries();
    const panels = Object.entries(this.hass!.panels).map(([id, panel]) => ({
      id,
      ...panel,
    }));
    const lovelacePanels = panels.filter(
      (panel) => panel.component_name === "lovelace"
    );

    const viewConfigs = await Promise.all(
      lovelacePanels.map((panel) =>
        fetchConfig(this.hass!.connection, panel.url_path, true)
          .then((config) => [panel.id, config] as [string, typeof config])
          .catch((_) => [panel.id, undefined] as [string, undefined])
      )
    );

    const panelViewConfig = new Map(viewConfigs);

    const related = this._navigationGroups.related;
    const dashboards: NavigationItem[] = [];
    const views: NavigationItem[] = [];
    const apps: NavigationItem[] = [];
    const otherRoutes: NavigationItem[] = [];

    for (const panel of panels) {
      if (SYSTEM_PANELS.includes(panel.id)) continue;
      // Skip app panels — they are handled by the ingress panels fetch below
      if (panel.component_name === "app") continue;
      const path = `/${panel.url_path}`;
      const resolved = computeNavigationPathInfo(this.hass!, path);
      const isDashboardPanel =
        panel.component_name === "lovelace" ||
        PANEL_DASHBOARDS.includes(panel.id);
      const panelItem: NavigationItem = {
        id: path,
        primary: resolved.label,
        secondary: resolved.label !== path ? path : undefined,
        icon: resolved.icon || "mdi:view-dashboard",
        sorting_label: createSortingLabel(resolved.label, path),
        group: isDashboardPanel ? "dashboards" : "other_routes",
      };

      if (isDashboardPanel) {
        dashboards.push(panelItem);
      } else {
        otherRoutes.push(panelItem);
      }

      const config = panelViewConfig.get(panel.id);

      if (!config || !("views" in config)) continue;

      config.views.forEach((view, index) => {
        const viewPath = `/${panel.url_path}/${view.path ?? index}`;
        const viewInfo = computeNavigationPathInfo(
          this.hass!,
          viewPath,
          config
        );
        views.push({
          id: viewPath,
          secondary: viewPath,
          icon: viewInfo.icon || "mdi:view-compact",
          primary: viewInfo.label,
          sorting_label: createSortingLabel(viewInfo.label, viewPath),
          group: "views",
        });
      });
    }

    // Fetch all ingress add-on panels
    if (isComponentLoaded(this.hass!.config, "hassio")) {
      try {
        const collection = getIngressPanelInfoCollection(this.hass!.connection);
        const ingressPanels = await new Promise<
          Record<string, IngressPanelInfo>
        >((resolve) => {
          const unsub = collection.subscribe((data) => {
            resolve(data);
            unsub();
          });
        });
        for (const [slug, panel] of Object.entries(ingressPanels)) {
          const path = `/app/${slug}`;
          const resolved = computeNavigationPathInfo(this.hass!, path);
          apps.push({
            id: path,
            primary: panel.title,
            secondary: path,
            icon: panel.icon || resolved.icon,
            icon_path: resolved.iconPath || mdiPuzzle,
            sorting_label: createSortingLabel(panel.title, path),
            group: "apps",
          });
        }
      } catch (_err) {
        // Supervisor may not be available, silently ignore
      }
    }

    this._navigationGroups = {
      related,
      dashboards,
      views,
      apps,
      other_routes: otherRoutes,
    };

    this._navigationItems = [
      ...related,
      ...dashboards,
      ...views,
      ...apps,
      ...otherRoutes,
    ];

    this._loading = false;
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("context")) {
      this._loadRelatedItems();
    }
  }

  private async _loadRelatedItems() {
    const updateRelatedItems = (relatedItems: NavigationItem[]) => {
      this._navigationGroups = {
        ...this._navigationGroups,
        related: relatedItems,
      };
      this._navigationItems = [
        ...relatedItems,
        ...this._navigationGroups.dashboards,
        ...this._navigationGroups.views,
        ...this._navigationGroups.apps,
        ...this._navigationGroups.other_routes,
      ];
    };

    if (!this.hass || (!this.context?.entity_id && !this.context?.area_id)) {
      updateRelatedItems([]);
      return;
    }

    const context = this.context;
    const contextMatches = () =>
      this.context?.entity_id === context?.entity_id &&
      this.context?.area_id === context?.area_id;

    const items = await this._getRelatedItems(
      `${context.entity_id ?? ""}|${context.area_id ?? ""}`,
      context
    );
    if (contextMatches()) {
      updateRelatedItems(items);
    }
  }

  private async _fetchRelatedItems(
    context: ActionRelatedContext
  ): Promise<NavigationItem[]> {
    let relatedResult: RelatedResult | undefined;
    try {
      relatedResult = context.entity_id
        ? await findRelated(this.hass, "entity", context.entity_id)
        : await findRelated(this.hass, "area", context.area_id!);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error fetching related items for navigation picker", err);
      return [];
    }

    const relatedDeviceIds = new Set(relatedResult?.device ?? []);
    const relatedAreaIds = new Set(relatedResult?.area ?? []);
    if (context.area_id) {
      relatedAreaIds.add(context.area_id);
    }

    const relatedItems: NavigationItem[] = [];
    for (const deviceId of relatedDeviceIds) {
      const device = this.hass.devices[deviceId];
      const path = `/config/devices/device/${deviceId}`;
      const resolved = computeNavigationPathInfo(this.hass, path);
      relatedItems.push({
        id: path,
        primary: resolved.label,
        secondary: path,
        icon: resolved.icon,
        icon_path: resolved.iconPath,
        sorting_label: createSortingLabel(
          RELATED_SORT_PREFIX.device,
          resolved.label,
          path
        ),
        group: "related",
        domain: device?.primary_config_entry
          ? this._configEntryLookup[device.primary_config_entry]?.domain
          : undefined,
      });
    }

    for (const areaId of relatedAreaIds) {
      // Area dashboard view
      const viewPath = `/home/${computeAreaPath(areaId)}`;
      const resolvedArea = computeNavigationPathInfo(this.hass, viewPath);
      relatedItems.push({
        id: viewPath,
        primary: resolvedArea.label,
        secondary: viewPath,
        icon: resolvedArea.icon,
        icon_path: resolvedArea.icon ? undefined : resolvedArea.iconPath,
        sorting_label: createSortingLabel(
          RELATED_SORT_PREFIX.area_view,
          resolvedArea.label,
          viewPath
        ),
        group: "related",
      });

      // Area settings
      const path = `/config/areas/area/${areaId}`;
      relatedItems.push({
        id: path,
        primary: this.hass.localize(
          "ui.components.navigation-picker.area_settings",
          { area: resolvedArea.label }
        ),
        secondary: path,
        icon: resolvedArea.icon,
        icon_path: resolvedArea.icon ? undefined : resolvedArea.iconPath,
        sorting_label: createSortingLabel(
          RELATED_SORT_PREFIX.area,
          resolvedArea.label,
          path
        ),
        group: "related",
      });
    }

    return relatedItems;
  }

  private async _loadConfigEntries() {
    if (Object.keys(this._configEntryLookup).length) {
      return;
    }

    try {
      const configEntries = await getConfigEntries(this.hass);
      this._configEntryLookup = Object.fromEntries(
        configEntries.map((entry) => [entry.entry_id, entry])
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error fetching config entries for navigation picker", err);
    }
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
