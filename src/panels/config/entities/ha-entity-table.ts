import { consume } from "@lit/context";
import {
  mdiAlertCircle,
  mdiCancel,
  mdiEyeOff,
  mdiPencilOff,
  mdiRestoreAlert,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { guard } from "lit/directives/guard";
import { styleMap } from "lit/directives/style-map";
import memoize from "memoize-one";
import {
  fireEvent,
  type HASSDomCurrentTargetEvent,
  type HASSDomEvent,
} from "../../../common/dom/fire_event";
import { computeAreaName } from "../../../common/entity/compute_area_name";
import {
  computeDeviceName,
  getDuplicatedDeviceNames,
} from "../../../common/entity/compute_device_name";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeEntityEntryName } from "../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { slugify } from "../../../common/string/slugify";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { deepEqual } from "../../../common/util/deep-equal";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-labels";
import "../../../components/ha-alert";
import "../../../components/ha-entity-id-icon";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-domains";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-integrations";
import "../../../components/ha-filter-labels";
import "../../../components/ha-filter-states";
import "../../../components/ha-filter-voice-assistants";
import "../../../components/ha-icon";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { CloudStatus } from "../../../data/cloud";
import type { ConfigEntry, SubEntry } from "../../../data/config_entries";
import { getSubEntries } from "../../../data/config_entries";
import {
  areasContext,
  configEntriesContext,
  devicesContext,
  fullEntitiesContext,
  internationalizationContext,
  labelsContext,
  statesContext,
} from "../../../data/context";
import type {
  DataTableFilter,
  DataTableFiltersItems,
  DataTableFiltersValues,
} from "../../../data/data_table_filters";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { EntitySources } from "../../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../../data/entity/entity_sources";
import type { ExposeEntitySettings } from "../../../data/expose";
import { listExposedEntities, voiceAssistants } from "../../../data/expose";
import { domainToName } from "../../../data/integration";
import type { LabelRegistryEntry } from "../../../data/label/label_registry";
import "../../../layouts/hass-loading-screen";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
  Route,
} from "../../../types";
import {
  getAreaTableColumn,
  getCreatedAtTableColumn,
  getDomainTableColumn,
  getEntityIdTableColumn,
  getLabelsTableColumn,
  getModifiedAtTableColumn,
} from "../common/data-table-columns";
import {
  getAssistantsSortableKey,
  getAssistantsTableColumn,
} from "../voice-assistants/expose/assistants-table-column";
import { getAvailableAssistants } from "../voice-assistants/expose/available-assistants";

export interface StateEntity extends Omit<
  EntityRegistryEntry,
  "id" | "unique_id"
> {
  readonly?: boolean;
  selectable?: boolean;
  id?: string;
  unique_id?: string;
}

export interface EntityRow extends StateEntity {
  unavailable: boolean;
  restored: boolean;
  status: string | undefined;
  area?: string;
  device?: string;
  device_full?: string;
  localized_platform: string;
  domain: string;
  label_entries: LabelRegistryEntry[];
  assistants: string[];
  assistants_sortable_key: string | undefined;
  enabled: string;
  visible: string;
  available: string;
}

export interface EntityTableFilterContext {
  filteredDomains: ReadonlySet<string>;
  filteredConfigEntry: ConfigEntry | undefined;
}

@customElement("ha-entity-table")
export class HaEntityTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean }) public narrow = false;
  @property({ attribute: false }) public route!: Route;
  @property({ attribute: false }) public tabs: PageNavigation[] = [];
  @property({ attribute: "back-path" }) public backPath?: string;
  @property({ attribute: false }) public cloudStatus?: CloudStatus;
  @property() public filter = "";
  @property({ attribute: false }) public filterValues: DataTableFiltersValues =
    {};
  @property({ type: Boolean }) public selectable = false;
  @property({ type: Boolean }) public clickable = false;
  @property({ type: Number }) public selected = 0;
  @property({ attribute: "has-fab", type: Boolean }) public hasFab = false;
  @property({ attribute: false }) public initialSorting?: SortingChangedEvent;
  @property({ attribute: false }) public initialGroupColumn?: string;
  @property({ attribute: false }) public initialCollapsedGroups?: string[];
  @property({ attribute: false }) public columnOrder?: string[];
  @property({ attribute: false }) public hiddenColumns?: string[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  private _entities?: EntityRegistryEntry[];
  @state()
  @consume({ context: statesContext, subscribe: true })
  private _entityStates!: HomeAssistant["states"];
  @state()
  @consume({ context: devicesContext, subscribe: true })
  private _devices!: HomeAssistant["devices"];
  @state()
  @consume({ context: areasContext, subscribe: true })
  private _areas!: HomeAssistant["areas"];
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: HomeAssistantInternationalization;
  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labels?: LabelRegistryEntry[];
  @state()
  @consume({ context: configEntriesContext, subscribe: true })
  private _entries?: ConfigEntry[];

  @state() private _subEntries?: SubEntry[];
  @state() private _entitySources?: EntitySources;
  @state() private _exposedEntities?: Record<string, ExposeEntitySettings>;
  @state() private _filteredItems: DataTableFiltersItems = {};
  @state() private _expandedFilter?: string;
  private _itemFilterValues: DataTableFiltersValues = {};
  private _subEntryConfigEntry?: string;
  private _filterContext?: EntityTableFilterContext;

  @query("hass-tabs-subpage-data-table")
  private _dataTable?: HaTabsSubpageDataTable;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      "exposed-entities-changed",
      this._fetchExposedEntities
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      "exposed-entities-changed",
      this._fetchExposedEntities
    );
  }

  public clearSelection() {
    this._dataTable?.clearSelection();
  }

  protected firstUpdated() {
    this._fetchExposedEntities();
    fetchEntitySourcesWithCache(this.hass).then((sources) => {
      this._entitySources = sources;
    });
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    if (changedProps.has("filterValues")) {
      this._filteredItems = Object.fromEntries(
        Object.entries(this._filteredItems).filter(
          ([key]) =>
            this.filterValues[key] !== undefined &&
            deepEqual(this.filterValues[key], this._itemFilterValues[key])
        )
      );
      const configEntry =
        Array.isArray(this.filterValues.config_entry) &&
        this.filterValues.config_entry.length === 1
          ? this.filterValues.config_entry[0]
          : undefined;
      const subEntryConfigEntry =
        Array.isArray(this.filterValues.sub_entry) &&
        this.filterValues.sub_entry.length
          ? configEntry
          : undefined;
      if (subEntryConfigEntry !== this._subEntryConfigEntry) {
        this._subEntryConfigEntry = subEntryConfigEntry;
        this._subEntries = undefined;
        if (subEntryConfigEntry) {
          this._loadSubEntries(subEntryConfigEntry);
        }
      }
    }
  }

  protected updated() {
    if (!this._entities) {
      return;
    }
    const { filteredDomains, filteredConfigEntry } = this._getRows();
    if (
      this._filterContext &&
      this._filterContext.filteredConfigEntry === filteredConfigEntry &&
      this._filterContext.filteredDomains.size === filteredDomains.size &&
      [...filteredDomains].every((domain) =>
        this._filterContext!.filteredDomains.has(domain)
      )
    ) {
      return;
    }
    this._filterContext = { filteredDomains, filteredConfigEntry };
    fireEvent(this, "entity-table-filter-context-changed", this._filterContext);
  }

  private _states = memoize((localize: LocalizeFunc) => [
    {
      value: "available",
      label: localize("ui.panel.config.entities.picker.status.available"),
    },
    {
      value: "unavailable",
      label: localize("ui.panel.config.entities.picker.status.unavailable"),
    },
    {
      value: "enabled",
      label: localize("ui.panel.config.entities.picker.status.enabled"),
    },
    {
      value: "disabled",
      label: localize("ui.panel.config.entities.picker.status.disabled"),
    },
    {
      value: "visible",
      label: localize("ui.panel.config.entities.picker.status.visible"),
    },
    {
      value: "hidden",
      label: localize("ui.panel.config.entities.picker.status.hidden"),
    },
    {
      value: "readonly",
      label: localize("ui.panel.config.entities.picker.status.unmanageable"),
    },
    {
      value: "restored",
      label: localize("ui.panel.config.entities.picker.status.not_provided"),
    },
  ]);

  private _columns = memoize(
    (
      localize: LocalizeFunc,
      hass: HomeAssistant,
      availableAssistants: string[],
      entitiesToCheck: EntityRow[]
    ): DataTableColumnContainer<EntityRow> => ({
      icon: {
        title: "",
        label: localize("ui.panel.config.entities.picker.headers.state_icon"),
        type: "icon",
        showNarrow: true,
        moveable: false,
        template: (entry) =>
          entry.icon
            ? html`<ha-icon .icon=${entry.icon}></ha-icon>`
            : html`<ha-entity-id-icon
                state-title
                slot="item-icon"
                .entityId=${entry.entity_id}
              ></ha-entity-id-icon>`,
      },
      name: {
        main: true,
        title: localize("ui.panel.config.entities.picker.headers.entity"),
        sortable: true,
        filterable: true,
        direction: "asc",
        extraTemplate: (entry) =>
          entry.label_entries.length
            ? html`<ha-data-table-labels
                .labels=${entry.label_entries}
              ></ha-data-table-labels>`
            : nothing,
      },
      device: {
        title: localize("ui.panel.config.entities.picker.headers.device"),
        sortable: true,
        template: (entry) => entry.device || "\u2014",
      },
      device_full: {
        title: localize("ui.panel.config.entities.picker.headers.device"),
        filterable: true,
        groupable: true,
        hidden: true,
      },
      area: getAreaTableColumn(localize),
      entity_id: getEntityIdTableColumn(localize, true),
      localized_platform: {
        title: localize("ui.panel.config.entities.picker.headers.integration"),
        sortable: true,
        groupable: true,
        filterable: true,
      },
      domain: getDomainTableColumn(localize),
      disabled_by: {
        title: localize("ui.panel.config.entities.picker.headers.disabled_by"),
        hidden: true,
        filterable: true,
        template: (entry) =>
          entry.disabled_by === null
            ? ""
            : localize(`config_entry.disabled_by.${entry.disabled_by}`),
      },
      status: {
        title: localize("ui.panel.config.entities.picker.headers.status"),
        type: "icon",
        showNarrow: true,
        sortable: true,
        filterable: true,
        minWidth: "80px",
        maxWidth: "80px",
        template: (entry) =>
          entry.unavailable ||
          entry.disabled_by ||
          entry.hidden_by ||
          entry.readonly
            ? html`<div
                tabindex="0"
                style="display:inline-block; position: relative;"
              >
                <ha-svg-icon
                  .id="status-icon-${slugify(entry.entity_id)}"
                  style=${styleMap({ color: entry.unavailable ? "var(--error-color)" : "" })}
                  .path=${entry.restored ? mdiRestoreAlert : entry.unavailable ? mdiAlertCircle : entry.disabled_by ? mdiCancel : entry.hidden_by ? mdiEyeOff : mdiPencilOff}
                ></ha-svg-icon>
                <ha-tooltip
                  .for="status-icon-${slugify(entry.entity_id)}"
                  placement="left"
                >
                  ${
                    entry.restored
                      ? localize(
                          "ui.panel.config.entities.picker.status.not_provided"
                        )
                      : entry.unavailable
                        ? localize(
                            "ui.panel.config.entities.picker.status.unavailable"
                          )
                        : entry.disabled_by
                          ? localize(
                              "ui.panel.config.entities.picker.status.disabled"
                            )
                          : entry.hidden_by
                            ? localize(
                                "ui.panel.config.entities.picker.status.hidden"
                              )
                            : localize(
                                "ui.panel.config.entities.picker.status.unmanageable"
                              )
                  }
                </ha-tooltip>
              </div>`
            : "\u2014",
      },
      created_at: getCreatedAtTableColumn(localize, hass),
      modified_at: getModifiedAtTableColumn(localize, hass),
      available: {
        title: localize("ui.panel.config.entities.picker.headers.availability"),
        sortable: true,
        groupable: true,
        hidden: true,
      },
      visible: {
        title: localize("ui.panel.config.entities.picker.headers.visibility"),
        sortable: true,
        groupable: true,
        hidden: true,
      },
      enabled: {
        title: localize("ui.panel.config.entities.picker.headers.enabled"),
        sortable: true,
        groupable: true,
        hidden: true,
      },
      labels: getLabelsTableColumn(),
      assistants: getAssistantsTableColumn(
        localize,
        hass,
        availableAssistants,
        entitiesToCheck
      ),
    })
  );

  private _stateEntities = memoize(
    (
      states: HomeAssistant["states"],
      entities: EntityRegistryEntry[],
      sources: EntitySources | undefined,
      exposedEntities: Record<string, ExposeEntitySettings> | undefined
    ): StateEntity[] => {
      const regEntityIds = new Set(entities.map((entity) => entity.entity_id));
      return Object.keys(states)
        .filter((entityId) => !regEntityIds.has(entityId))
        .map((entityId) => ({
          name: computeStateName(states[entityId]),
          entity_id: entityId,
          platform: sources?.[entityId]?.domain || computeDomain(entityId),
          disabled_by: null,
          hidden_by: null,
          area_id: null,
          config_entry_id: null,
          config_subentry_id: null,
          device_id: null,
          icon: null,
          readonly: true,
          selectable: false,
          entity_category: null,
          has_entity_name: false,
          options: Object.fromEntries(
            Object.keys(voiceAssistants).map((vaId) => [
              vaId,
              { should_expose: exposedEntities?.[entityId]?.[vaId] },
            ])
          ),
          labels: [],
          categories: {},
          created_at: 0,
          modified_at: 0,
        }));
    }
  );

  private _filteredEntitiesAndDomains = memoize(
    (
      localize: LocalizeFunc,
      entities: StateEntity[],
      states: HomeAssistant["states"],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"],
      entitiesWithoutUniqueId: StateEntity[],
      filters: DataTableFiltersValues,
      filteredItems: DataTableFiltersItems,
      entries: ConfigEntry[] | undefined,
      labelReg: LabelRegistryEntry[] | undefined,
      entitySources: EntitySources | undefined,
      exposedEntities: Record<string, ExposeEntitySettings> | undefined
    ) => {
      const result: EntityRow[] = [];
      const stateFilters = filters["ha-filter-states"] as string[];
      const showEnabled =
        !stateFilters?.length || stateFilters.includes("enabled");
      const showDisabled =
        !stateFilters?.length || stateFilters.includes("disabled");
      const showVisible =
        !stateFilters?.length || stateFilters.includes("visible");
      const showHidden =
        !stateFilters?.length || stateFilters.includes("hidden");
      const showAvailable =
        !stateFilters?.length || stateFilters.includes("available");
      const showUnavailable =
        !stateFilters?.length || stateFilters.includes("unavailable");
      const showRestored =
        !stateFilters?.length || stateFilters.includes("restored");
      const showReadOnly =
        !stateFilters?.length || stateFilters.includes("readonly");

      let filteredEntities = entities.concat(entitiesWithoutUniqueId);
      let filteredConfigEntry: ConfigEntry | undefined;
      const filteredDomains = new Set<string>();

      Object.entries(filters).forEach(([key, filter]) => {
        if (!Array.isArray(filter) || !filter.length) {
          return;
        }
        if (key === "config_entry") {
          filteredEntities = filteredEntities.filter(
            (entity) =>
              entity.config_entry_id && filter.includes(entity.config_entry_id)
          );
          const configEntries = entries?.filter((entry) =>
            filter.includes(entry.entry_id)
          );
          configEntries?.forEach((entry) => filteredDomains.add(entry.domain));
          if (configEntries?.length === 1) {
            filteredConfigEntry = configEntries[0];
          }
        } else if (key === "sub_entry") {
          if (
            !Array.isArray(filters.config_entry) ||
            filters.config_entry.length !== 1
          ) {
            return;
          }
          filteredEntities = filteredEntities.filter(
            (entity) =>
              entity.config_subentry_id &&
              filter.includes(entity.config_subentry_id)
          );
        } else if (key === "ha-filter-integrations") {
          const entryIds =
            entries
              ?.filter((entry) => filter.includes(entry.domain))
              .map((entry) => entry.entry_id) || [];
          filteredEntities = filteredEntities.filter(
            (entity) =>
              filter.includes(
                entitySources?.[entity.entity_id]?.domain ?? ""
              ) ||
              filter.includes(entity.platform) ||
              (entity.config_entry_id &&
                entryIds.includes(entity.config_entry_id))
          );
          filter.forEach((domain) => filteredDomains.add(domain));
        } else if (key === "ha-filter-domains") {
          filteredEntities = filteredEntities.filter((entity) =>
            filter.includes(computeDomain(entity.entity_id))
          );
        } else if (key === "ha-filter-labels") {
          filteredEntities = filteredEntities.filter((entity) =>
            entity.labels.some((lbl) => filter.includes(lbl))
          );
        } else if (key === "ha-filter-voice-assistants") {
          filteredEntities = filteredEntities.filter((entity) =>
            filter.some((va) => exposedEntities?.[entity.entity_id]?.[va])
          );
        }
      });

      Object.values(filteredItems).forEach((items) => {
        if (items) {
          filteredEntities = filteredEntities.filter((entity) =>
            items.has(entity.entity_id)
          );
        }
      });

      const duplicatedDevicesNames = getDuplicatedDeviceNames(devices);
      for (const entry of filteredEntities) {
        const entity = states[entry.entity_id];
        const unavailable = entity?.state === UNAVAILABLE;
        const restored = entity?.attributes.restored === true;
        const device = entry.device_id ? devices[entry.device_id] : undefined;
        const areaId = entry.area_id || device?.area_id;
        const area = areaId ? areas[areaId] : undefined;
        const hidden = !!entry.hidden_by;
        const disabled = !!entry.disabled_by;
        const readonly = entry.readonly;
        const available = entity?.state && entity.state !== UNAVAILABLE;
        if (!(
          (showAvailable && available) ||
          (showUnavailable && unavailable) ||
          (showRestored && restored) ||
          (showVisible && !hidden) ||
          (showHidden && hidden) ||
          (showDisabled && disabled) ||
          (showEnabled && !disabled) ||
          (showReadOnly && readonly)
        )) {
          continue;
        }
        const labelsEntries = (entry.labels || [])
          .map((lbl) => labelReg?.find((label) => label.label_id === lbl))
          .filter((lbl): lbl is LabelRegistryEntry => lbl !== undefined);
        const entityName = computeEntityEntryName(
          entry as EntityRegistryEntry,
          devices,
          entity
        );
        const deviceName = device ? computeDeviceName(device) : undefined;
        const areaName = area ? computeAreaName(area) : undefined;
        const deviceFullName = deviceName
          ? duplicatedDevicesNames.has(deviceName) && areaName
            ? `${deviceName} (${areaName})`
            : deviceName
          : undefined;
        const assistants = Object.keys(voiceAssistants).filter(
          (va) => exposedEntities?.[entry.entity_id]?.[va]
        );
        result.push({
          ...entry,
          name: entityName || deviceName || entry.entity_id,
          device: deviceName,
          area: areaName,
          device_full: deviceFullName,
          unavailable,
          restored,
          localized_platform: domainToName(localize, entry.platform),
          domain: domainToName(localize, computeDomain(entry.entity_id)),
          assistants,
          assistants_sortable_key: getAssistantsSortableKey(assistants),
          status: restored
            ? localize("ui.panel.config.entities.picker.status.not_provided")
            : unavailable
              ? localize("ui.panel.config.entities.picker.status.unavailable")
              : disabled
                ? localize("ui.panel.config.entities.picker.status.disabled")
                : hidden
                  ? localize("ui.panel.config.entities.picker.status.hidden")
                  : readonly
                    ? localize(
                        "ui.panel.config.entities.picker.status.unmanageable"
                      )
                    : localize(
                        "ui.panel.config.entities.picker.status.available"
                      ),
          label_entries: labelsEntries,
          available: unavailable
            ? localize("ui.panel.config.entities.picker.status.unavailable")
            : localize("ui.panel.config.entities.picker.status.available"),
          enabled: disabled
            ? localize("ui.panel.config.entities.picker.status.disabled")
            : localize("ui.panel.config.entities.picker.status.enabled"),
          visible: hidden
            ? localize("ui.panel.config.entities.picker.status.hidden")
            : localize("ui.panel.config.entities.picker.status.visible"),
        });
      }
      return { filteredEntities: result, filteredConfigEntry, filteredDomains };
    }
  );

  private _getRows() {
    return this._filteredEntitiesAndDomains(
      this._i18n.localize,
      this._entities!,
      this._entityStates,
      this._devices,
      this._areas,
      this._stateEntities(
        this._entityStates,
        this._entities!,
        this._entitySources,
        this._exposedEntities
      ),
      this.filterValues,
      this._filteredItems,
      this._entries,
      this._labels,
      this._entitySources,
      this._exposedEntities
    );
  }

  protected render() {
    if (!this.hass || !this._entities) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }
    const { filteredEntities } = this._getRows();
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this.backPath}
        .route=${this.route}
        .tabs=${this.tabs}
        .columns=${this._columns(this._i18n.localize, this.hass, getAvailableAssistants(this.cloudStatus, this.hass), filteredEntities)}
        .data=${filteredEntities}
        .searchLabel=${this._i18n.localize("ui.panel.config.entities.picker.search", { number: filteredEntities.length })}
        has-filters
        .filters=${Object.values(this.filterValues).filter((filter) => (Array.isArray(filter) ? filter.length : filter && Object.values(filter).some((val) => (Array.isArray(val) ? val.length : val)))).length}
        .selectable=${this.selectable}
        .selected=${this.selected}
        .initialGroupColumn=${this.initialGroupColumn}
        .initialCollapsedGroups=${this.initialCollapsedGroups}
        .initialSorting=${this.initialSorting}
        .columnOrder=${this.columnOrder}
        .hiddenColumns=${this.hiddenColumns}
        .clickable=${this.clickable}
        @clear-filter=${this._clearFilter}
        .filter=${this.filter}
        @row-click=${this._rowClicked}
        id="entity_id"
        .hasFab=${this.hasFab}
        class=${this.narrow ? "narrow" : ""}
      >
        <slot name="toolbar-icon" slot="toolbar-icon"></slot>
        <slot name="selection-bar" slot="selection-bar"></slot>
        <slot name="top-header" slot="top-header"></slot>
        <slot name="fab" slot="fab"></slot>
        ${
          Array.isArray(this.filterValues.config_entry) &&
          this.filterValues.config_entry.length
            ? html`<ha-alert slot="filter-pane">
                ${this._i18n.localize("ui.panel.config.entities.picker.filtering_by_config_entry")}
                ${this._entries?.find((entry) => entry.entry_id === this.filterValues.config_entry![0])?.title || this.filterValues.config_entry[0]}${
                  this.filterValues.config_entry.length === 1 &&
                  Array.isArray(this.filterValues.sub_entry) &&
                  this.filterValues.sub_entry.length
                    ? html` (${this._subEntries?.find((entry) => entry.subentry_id === this.filterValues.sub_entry![0])?.title || this.filterValues.sub_entry[0]})`
                    : nothing
                }
              </ha-alert>`
            : nothing
        }
        <ha-filter-floor-areas
          type="entity"
          .value=${guard(
            [this.filterValues["ha-filter-floor-areas"]],
            () => this.filterValues["ha-filter-floor-areas"]
          )}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-floor-areas"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-floor-areas>
        <ha-filter-devices
          type="entity"
          .value=${guard(
            [this.filterValues["ha-filter-devices"]],
            () => this.filterValues["ha-filter-devices"]
          )}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-devices"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-devices>
        <ha-filter-domains
          .value=${this.filterValues["ha-filter-domains"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-domains"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-domains>
        <ha-filter-integrations
          .value=${this.filterValues["ha-filter-integrations"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-integrations"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-integrations>
        <ha-filter-states
          .label=${this._i18n.localize("ui.panel.config.entities.picker.headers.status")}
          .value=${this.filterValues["ha-filter-states"]}
          .states=${this._states(this._i18n.localize)}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-states"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-states>
        <ha-filter-labels
          .value=${this.filterValues["ha-filter-labels"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-labels"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-labels>
        <ha-filter-voice-assistants
          .value=${this.filterValues["ha-filter-voice-assistants"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-voice-assistants"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-voice-assistants>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _filterExpanded(
    ev: HASSDomEvent<{ expanded: boolean }> &
      HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    if (ev.detail.expanded) {
      this._expandedFilter = ev.currentTarget.localName;
    } else if (this._expandedFilter === ev.currentTarget.localName) {
      this._expandedFilter = undefined;
    }
  }

  private _filterChanged(
    ev: HASSDomEvent<DataTableFilter> & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    ev.stopPropagation();
    const type = ev.currentTarget.localName;
    this._itemFilterValues[type] = ev.detail.value;
    this._filteredItems = {
      ...this._filteredItems,
      [type]: (
        Array.isArray(ev.detail.value)
          ? ev.detail.value.length
          : ev.detail.value &&
            Object.values(ev.detail.value).some((values) => values.length)
      )
        ? ev.detail.items
        : undefined,
    };
    this.filterValues = { ...this.filterValues, [type]: ev.detail.value };
    fireEvent(this, "entity-table-filters-changed", {
      value: this.filterValues,
    });
  }

  private _clearFilter() {
    this._filteredItems = {};
    this._itemFilterValues = {};
    this.filterValues = {};
    fireEvent(this, "entity-table-filters-changed", {
      value: this.filterValues,
    });
  }

  private _rowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    ev.stopPropagation();
    fireEvent(this, "row-click", ev.detail, { bubbles: false });
  }

  private async _loadSubEntries(entryId: string) {
    const entries = await getSubEntries(this.hass, entryId);
    if (this._subEntryConfigEntry === entryId) {
      this._subEntries = entries;
    }
  }

  private _fetchExposedEntities = async () => {
    try {
      this._exposedEntities = (
        await listExposedEntities(this.hass)
      ).exposed_entities;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch exposed entities", err);
      this._exposedEntities = {};
    }
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    hass-tabs-subpage-data-table {
      --data-table-row-height: 60px;
    }
    hass-tabs-subpage-data-table.narrow {
      --data-table-row-height: 72px;
    }
    hass-loading-screen {
      --app-header-background-color: var(--sidebar-background-color);
      --app-header-text-color: var(--sidebar-text-color);
    }
  `;
}

declare global {
  interface HASSDomEvents {
    "entity-table-filter-context-changed": EntityTableFilterContext;
    "entity-table-filters-changed": { value: DataTableFiltersValues };
  }
  interface HTMLElementTagNameMap {
    "ha-entity-table": HaEntityTable;
  }
}
