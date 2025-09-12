import { consume } from "@lit/context";
import {
  mdiAlertCircle,
  mdiCancel,
  mdiChevronRight,
  mdiDelete,
  mdiDotsVertical,
  mdiEye,
  mdiEyeOff,
  mdiMenuDown,
  mdiPencilOff,
  mdiPlus,
  mdiRestore,
  mdiRestoreAlert,
  mdiToggleSwitch,
  mdiToggleSwitchOffOutline,
} from "@mdi/js";
import type { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoize from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatShortDateTimeWithConditionalYear } from "../../../common/datetime/format_date_time";
import { storage } from "../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeAreaName } from "../../../common/entity/compute_area_name";
import {
  computeDeviceName,
  getDuplicatedDeviceNames,
} from "../../../common/entity/compute_device_name";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeEntityEntryName } from "../../../common/entity/compute_entity_name";
import { computeStateName } from "../../../common/entity/compute_state_name";
import {
  deleteEntity,
  isDeletableEntity,
} from "../../../common/entity/delete_entity";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import type { LocalizeFunc } from "../../../common/translations/localize";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../../common/util/promise-all-settled-results";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-labels";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-check-list-item";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-domains";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-integrations";
import "../../../components/ha-filter-labels";
import "../../../components/ha-filter-states";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-divider";
import "../../../components/ha-md-menu-item";
import "../../../components/ha-sub-menu";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { ConfigEntry, SubEntry } from "../../../data/config_entries";
import { getConfigEntries, getSubEntries } from "../../../data/config_entries";
import { fullEntitiesContext } from "../../../data/context";
import type {
  DataTableFiltersItems,
  DataTableFiltersValues,
} from "../../../data/data_table_filters";
import { UNAVAILABLE } from "../../../data/entity";
import type {
  EntityRegistryEntry,
  UpdateEntityRegistryEntryResult,
} from "../../../data/entity_registry";
import { updateEntityRegistryEntry } from "../../../data/entity_registry";
import type { EntitySources } from "../../../data/entity_sources";
import { fetchEntitySourcesWithCache } from "../../../data/entity_sources";
import { HELPERS_CRUD } from "../../../data/helpers_crud";
import type { IntegrationManifest } from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifests,
} from "../../../data/integration";
import type { LabelRegistryEntry } from "../../../data/label_registry";
import {
  createLabelRegistryEntry,
  subscribeLabelRegistry,
} from "../../../data/label_registry";
import { regenerateEntityIds } from "../../../data/regenerate_entity_ids";
import {
  getEntityRecordingList,
  getEntityRecordingSettings,
  setEntityRecordingOptions,
  type EntityRecordingList,
} from "../../../data/recorder";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import type { Helper } from "../helpers/const";
import { isHelperDomain } from "../helpers/const";
import "../integrations/ha-integration-overflow-menu";
import { showAddIntegrationDialog } from "../integrations/show-add-integration-dialog";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";
import { slugify } from "../../../common/string/slugify";

export interface StateEntity
  extends Omit<EntityRegistryEntry, "id" | "unique_id"> {
  readonly?: boolean;
  selectable?: boolean;
  id?: string;
  unique_id?: string;
}

export interface EntityRow extends StateEntity {
  entity?: HassEntity;
  unavailable: boolean;
  restored: boolean;
  status: string | undefined;
  area?: string;
  device?: string;
  device_full?: string;
  localized_platform: string;
  domain: string;
  label_entries: LabelRegistryEntry[];
  enabled: string;
  visible: string;
  available: string;
  recorded?: boolean;
}

@customElement("ha-config-entities")
export class HaConfigEntities extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _stateEntities: StateEntity[] = [];

  @state() private _entries?: ConfigEntry[];

  @state() private _subEntries?: SubEntry[];

  @state() private _manifests?: IntegrationManifest[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entities!: EntityRegistryEntry[];

  @state()
  @storage({
    storage: "sessionStorage",
    key: "entities-table-search",
    state: true,
    subscribe: false,
  })
  private _filter: string = history.state?.filter || "";

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state()
  @storage({
    storage: "sessionStorage",
    key: "entities-table-filters",
    state: true,
    subscribe: false,
  })
  private _filters: DataTableFiltersValues = {};

  @state() private _filteredItems: DataTableFiltersItems = {};

  @state() private _selected: string[] = [];

  @state() private _expandedFilter?: string;

  @state()
  _labels!: LabelRegistryEntry[];

  @state() private _entitySources?: EntitySources;

  @state() private _recordingEntities?: EntityRecordingList;

  @storage({ key: "entities-table-sort", state: false, subscribe: false })
  private _activeSorting?: SortingChangedEvent;

  @storage({ key: "entities-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string;

  @storage({
    key: "entities-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string;

  @storage({
    key: "entities-table-column-order",
    state: false,
    subscribe: false,
  })
  private _activeColumnOrder?: string[];

  @storage({
    key: "entities-table-hidden-columns",
    state: false,
    subscribe: false,
  })
  private _activeHiddenColumns?: string[];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("location-changed", this._locationChanged);
    window.addEventListener("popstate", this._popState);
    window.addEventListener(
      "entity-recording-updated",
      this._handleEntityRecordingUpdated
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._locationChanged);
    window.removeEventListener("popstate", this._popState);
    window.removeEventListener(
      "entity-recording-updated",
      this._handleEntityRecordingUpdated
    );
  }

  private _locationChanged = () => {
    if (window.location.search.substring(1) !== this._searchParms.toString()) {
      this._searchParms = new URLSearchParams(window.location.search);
      this._setFiltersFromUrl();
    }
  };

  private _popState = () => {
    if (window.location.search.substring(1) !== this._searchParms.toString()) {
      this._searchParms = new URLSearchParams(window.location.search);
      this._setFiltersFromUrl();
    }
  };

  private _handleEntityRecordingUpdated = async (
    ev: CustomEvent<{ entityId: string }>
  ) => {
    // Update recording data for the specific entity that changed
    if (!this._activeHiddenColumns?.includes("recorded")) {
      try {
        const settings = await getEntityRecordingSettings(
          this.hass,
          ev.detail.entityId
        );
        // Update the recording data for this specific entity
        this._recordingEntities = {
          ...this._recordingEntities,
          [ev.detail.entityId]: settings,
        };
      } catch (_err) {
        // Entity might not have recording settings yet, treat as enabled
        this._recordingEntities = {
          ...this._recordingEntities,
          [ev.detail.entityId]: { recording_disabled_by: null },
        };
      }
    }
  };

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
    (localize: LocalizeFunc): DataTableColumnContainer<EntityRow> => ({
      icon: {
        title: "",
        label: localize("ui.panel.config.entities.picker.headers.state_icon"),
        type: "icon",
        showNarrow: true,
        moveable: false,
        template: (entry) =>
          entry.icon
            ? html`<ha-icon .icon=${entry.icon}></ha-icon>`
            : entry.entity
              ? html`
                  <ha-state-icon
                    title=${ifDefined(
                      entry.entity
                        ? this.hass.formatEntityState(entry.entity)
                        : undefined
                    )}
                    slot="item-icon"
                    .hass=${this.hass}
                    .stateObj=${entry.entity}
                  ></ha-state-icon>
                `
              : html`<ha-domain-icon
                  .domain=${computeDomain(entry.entity_id)}
                ></ha-domain-icon>`,
      },
      name: {
        main: true,
        title: localize("ui.panel.config.entities.picker.headers.entity"),
        sortable: true,
        filterable: true,
        direction: "asc",
        extraTemplate: (entry) =>
          entry.label_entries.length
            ? html`
                <ha-data-table-labels
                  .labels=${entry.label_entries}
                ></ha-data-table-labels>
              `
            : nothing,
      },
      device: {
        title: localize("ui.panel.config.entities.picker.headers.device"),
        sortable: true,
        template: (entry) => entry.device || "—",
      },
      device_full: {
        title: localize("ui.panel.config.entities.picker.headers.device"),
        filterable: true,
        groupable: true,
        hidden: true,
      },
      area: {
        title: localize("ui.panel.config.entities.picker.headers.area"),
        sortable: true,
        filterable: true,
        groupable: true,
        template: (entry) => entry.area || "—",
      },
      entity_id: {
        title: localize("ui.panel.config.entities.picker.headers.entity_id"),
        sortable: true,
        filterable: true,
        defaultHidden: true,
      },
      localized_platform: {
        title: localize("ui.panel.config.entities.picker.headers.integration"),
        sortable: true,
        groupable: true,
        filterable: true,
      },
      domain: {
        title: localize("ui.panel.config.entities.picker.headers.domain"),
        sortable: false,
        hidden: true,
        filterable: true,
        groupable: true,
      },
      disabled_by: {
        title: localize("ui.panel.config.entities.picker.headers.disabled_by"),
        hidden: true,
        filterable: true,
        template: (entry) =>
          entry.disabled_by === null
            ? ""
            : this.hass.localize(
                `config_entry.disabled_by.${entry.disabled_by}`
              ),
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
            ? html`
                <div
                  tabindex="0"
                  style="display:inline-block; position: relative;"
                >
                  <ha-svg-icon
                    .id="status-icon-${slugify(entry.entity_id)}"
                    style=${styleMap({
                      color: entry.unavailable ? "var(--error-color)" : "",
                    })}
                    .path=${entry.restored
                      ? mdiRestoreAlert
                      : entry.unavailable
                        ? mdiAlertCircle
                        : entry.disabled_by
                          ? mdiCancel
                          : entry.hidden_by
                            ? mdiEyeOff
                            : mdiPencilOff}
                  ></ha-svg-icon>

                  <ha-tooltip
                    .for="status-icon-${slugify(entry.entity_id)}"
                    placement="left"
                  >
                    ${entry.restored
                      ? this.hass.localize(
                          "ui.panel.config.entities.picker.status.not_provided"
                        )
                      : entry.unavailable
                        ? this.hass.localize(
                            "ui.panel.config.entities.picker.status.unavailable"
                          )
                        : entry.disabled_by
                          ? this.hass.localize(
                              "ui.panel.config.entities.picker.status.disabled"
                            )
                          : entry.hidden_by
                            ? this.hass.localize(
                                "ui.panel.config.entities.picker.status.hidden"
                              )
                            : this.hass.localize(
                                "ui.panel.config.entities.picker.status.unmanageable"
                              )}
                  </ha-tooltip>
                </div>
              `
            : "—",
      },
      created_at: {
        title: localize("ui.panel.config.generic.headers.created_at"),
        defaultHidden: true,
        sortable: true,
        minWidth: "128px",
        template: (entry) =>
          entry.created_at
            ? formatShortDateTimeWithConditionalYear(
                new Date(entry.created_at * 1000),
                this.hass.locale,
                this.hass.config
              )
            : "—",
      },
      modified_at: {
        title: localize("ui.panel.config.generic.headers.modified_at"),
        defaultHidden: true,
        sortable: true,
        minWidth: "128px",
        template: (entry) =>
          entry.modified_at
            ? formatShortDateTimeWithConditionalYear(
                new Date(entry.modified_at * 1000),
                this.hass.locale,
                this.hass.config
              )
            : "—",
      },
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
      labels: {
        title: "",
        hidden: true,
        filterable: true,
        template: (entry) =>
          entry.label_entries.map((lbl) => lbl.name).join(" "),
      },
      recorded: {
        title: localize("ui.panel.config.entities.picker.headers.recorded"),
        type: "icon",
        sortable: true,
        filterable: true,
        defaultHidden: true,
        showNarrow: true,
        minWidth: "86px",
        maxWidth: "86px",
        template: (entry) =>
          entry.recorded === undefined
            ? "—"
            : entry.recorded
              ? html`
                  <div
                    tabindex="0"
                    style="display:inline-block; position: relative;"
                  >
                    <ha-svg-icon
                      .id="recording-icon-${slugify(entry.entity_id)}"
                      .path=${mdiToggleSwitch}
                      style="color: var(--success-color)"
                    ></ha-svg-icon>
                    <ha-tooltip
                      .for="recording-icon-${slugify(entry.entity_id)}"
                      placement="left"
                    >
                      ${this.hass.localize(
                        "ui.panel.config.entities.picker.recorded.enabled"
                      )}
                    </ha-tooltip>
                  </div>
                `
              : html`
                  <div
                    tabindex="0"
                    style="display:inline-block; position: relative;"
                  >
                    <ha-svg-icon
                      .id="recording-icon-${slugify(entry.entity_id)}"
                      .path=${mdiToggleSwitchOffOutline}
                      style="color: var(--secondary-text-color)"
                    ></ha-svg-icon>
                    <ha-tooltip
                      .for="recording-icon-${slugify(entry.entity_id)}"
                      placement="left"
                    >
                      ${this.hass.localize(
                        "ui.panel.config.entities.picker.recorded.disabled"
                      )}
                    </ha-tooltip>
                  </div>
                `,
      },
    })
  );

  private _hasNonUniqueIdEntities = memoize(
    (selected: string[], filteredEntities: EntityRow[]) => {
      // Create a Set of readonly entity IDs for O(1) lookup
      const readonlyEntityIds = new Set(
        filteredEntities
          .filter((e) => e.readonly === true)
          .map((e) => e.entity_id)
      );
      return selected.some((entityId) => readonlyEntityIds.has(entityId));
    }
  );

  private _filteredEntitiesAndDomains = memoize(
    (
      localize: LocalizeFunc,
      entities: StateEntity[],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"],
      stateEntities: StateEntity[],
      filters: DataTableFiltersValues,
      filteredItems: DataTableFiltersItems,
      entries?: ConfigEntry[],
      labelReg?: LabelRegistryEntry[],
      recordingEntities?: EntityRecordingList
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

      let filteredEntities = entities.concat(stateEntities);

      let filteredConfigEntry: ConfigEntry | undefined;
      const filteredDomains = new Set<string>();

      Object.entries(filters).forEach(([key, filter]) => {
        if (key === "config_entry" && Array.isArray(filter) && filter.length) {
          filteredEntities = filteredEntities.filter(
            (entity) =>
              entity.config_entry_id &&
              (filter as string[]).includes(entity.config_entry_id)
          );

          if (!entries) {
            this._loadConfigEntries();
            return;
          }

          const configEntries = entries.filter(
            (entry) =>
              entry.entry_id && (filter as string[]).includes(entry.entry_id)
          );

          configEntries.forEach((configEntry) => {
            filteredDomains.add(configEntry.domain);
          });
          if (configEntries.length === 1) {
            filteredConfigEntry = configEntries[0];
          }
        } else if (
          key === "sub_entry" &&
          Array.isArray(filter) &&
          filter.length
        ) {
          if (
            !(
              Array.isArray(this._filters.config_entry) &&
              this._filters.config_entry.length === 1
            )
          ) {
            return;
          }
          filteredEntities = filteredEntities.filter(
            (entity) =>
              entity.config_subentry_id &&
              (filter as string[]).includes(entity.config_subentry_id)
          );
          if (!this._subEntries) {
            this._loadSubEntries(this._filters.config_entry[0]);
          }
        } else if (
          key === "ha-filter-integrations" &&
          Array.isArray(filter) &&
          filter.length
        ) {
          if (!entries) {
            this._loadConfigEntries();
            return;
          }
          const entryIds = entries
            .filter((entry) => (filter as string[]).includes(entry.domain))
            .map((entry) => entry.entry_id);

          const filteredEntitiesByDomain = new Set<string>();

          const entitySources = this._entitySources || {};

          const entitiesByDomain = {};

          for (const [entity, source] of Object.entries(entitySources)) {
            if (!(source.domain in entitiesByDomain)) {
              entitiesByDomain[source.domain] = [];
            }
            entitiesByDomain[source.domain].push(entity);
          }

          for (const val of filter) {
            if (val in entitiesByDomain) {
              entitiesByDomain[val].forEach((item) =>
                filteredEntitiesByDomain.add(item)
              );
            }
          }

          filteredEntities = filteredEntities.filter(
            (entity) =>
              filteredEntitiesByDomain.has(entity.entity_id) ||
              (filter as string[]).includes(entity.platform) ||
              (entity.config_entry_id &&
                entryIds.includes(entity.config_entry_id))
          );
          filter!.forEach((domain) => filteredDomains.add(domain));
        } else if (
          key === "ha-filter-domains" &&
          Array.isArray(filter) &&
          filter.length
        ) {
          filteredEntities = filteredEntities.filter((entity) =>
            (filter as string[]).includes(computeDomain(entity.entity_id))
          );
        } else if (
          key === "ha-filter-labels" &&
          Array.isArray(filter) &&
          filter.length
        ) {
          filteredEntities = filteredEntities.filter((entity) =>
            entity.labels.some((lbl) => (filter as string[]).includes(lbl))
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
        const entity = this.hass.states[entry.entity_id];
        const unavailable = entity?.state === UNAVAILABLE;
        const restored = entity?.attributes.restored === true;
        const deviceId = entry.device_id;
        const areaId = entry.area_id || devices[deviceId!]?.area_id;
        const area = areaId ? areas[areaId] : undefined;
        const device = deviceId ? devices[deviceId] : undefined;
        const hidden = !!entry.hidden_by;
        const disabled = !!entry.disabled_by;
        const readonly = entry.readonly;
        const available = entity?.state && entity.state !== UNAVAILABLE;

        if (
          !(
            (showAvailable && available) ||
            (showUnavailable && unavailable) ||
            (showRestored && restored) ||
            (showVisible && !hidden) ||
            (showHidden && hidden) ||
            (showDisabled && disabled) ||
            (showEnabled && !disabled) ||
            (showReadOnly && readonly)
          )
        ) {
          continue;
        }

        const labels = labelReg && entry?.labels;
        const labelsEntries = (labels || []).map(
          (lbl) => labelReg!.find((label) => label.label_id === lbl)!
        );

        const entityName = computeEntityEntryName(
          entry as EntityRegistryEntry,
          this.hass
        );

        const deviceName = device ? computeDeviceName(device) : undefined;
        const areaName = area ? computeAreaName(area) : undefined;

        const deviceFullName = deviceName
          ? duplicatedDevicesNames.has(deviceName) && areaName
            ? `${deviceName} (${areaName})`
            : deviceName
          : undefined;

        // Determine recording status
        let recorded: boolean | undefined;
        if (recordingEntities) {
          const recordingSettings = recordingEntities[entry.entity_id];
          if (recordingSettings) {
            recorded = recordingSettings.recording_disabled_by === null;
          } else if (entry.options?.recorder) {
            // For entities in registry, check the options
            recorded = entry.options.recorder.recording_disabled_by === null;
          } else {
            // Entity not configured, defaults to recording enabled
            recorded = true;
          }
        }

        result.push({
          ...entry,
          entity,
          name: entityName || deviceName || entry.entity_id,
          device: deviceName,
          area: areaName,
          device_full: deviceFullName,
          unavailable,
          restored,
          localized_platform: domainToName(localize, entry.platform),
          domain: domainToName(localize, computeDomain(entry.entity_id)),
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
          recorded,
        });
      }

      return { filteredEntities: result, filteredConfigEntry, filteredDomains };
    }
  );

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeLabelRegistry(this.hass.connection, (labels) => {
        this._labels = labels;
      }),
    ];
  }

  protected render() {
    if (!this.hass || this._entities === undefined) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }

    const { filteredEntities, filteredDomains } =
      this._filteredEntitiesAndDomains(
        this.hass.localize,
        this._entities,
        this.hass.devices,
        this.hass.areas,
        this._stateEntities,
        this._filters,
        this._filteredItems,
        this._entries,
        this._labels,
        this._recordingEntities
      );

    const includeAddDeviceFab =
      filteredDomains.size === 1 &&
      (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
        [...filteredDomains][0]
      );

    // Check if any selected entities are without unique IDs (memoized for performance)
    const hasNonUniqueIdEntities = this._hasNonUniqueIdEntities(
      this._selected,
      filteredEntities
    );

    // Helper to render menu items that can be disabled for non-unique ID entities
    const renderDisableableMenuItem = (
      action: () => void,
      icon: string,
      labelKey: string,
      warning = false
    ) =>
      hasNonUniqueIdEntities
        ? html`
            <ha-md-menu-item
              .disabled=${true}
              class=${warning ? "warning" : ""}
              title=${this.hass.localize(
                "ui.panel.config.entities.picker.non_unique_id_selected"
              )}
            >
              <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
              <div slot="headline">${this.hass.localize(labelKey)}</div>
            </ha-md-menu-item>
          `
        : html`
            <ha-md-menu-item
              .clickAction=${action}
              class=${warning ? "warning" : ""}
            >
              <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
              <div slot="headline">${this.hass.localize(labelKey)}</div>
            </ha-md-menu-item>
          `;

    const labelItems = html` ${this._labels?.map((label) => {
        const color = label.color ? computeCssColor(label.color) : undefined;
        const selected = this._selected.every((entityId) =>
          this.hass.entities[entityId]?.labels.includes(label.label_id)
        );
        const partial =
          !selected &&
          this._selected.some((entityId) =>
            this.hass.entities[entityId]?.labels.includes(label.label_id)
          );
        return html`<ha-md-menu-item
          .value=${label.label_id}
          .action=${selected ? "remove" : "add"}
          @click=${this._handleBulkLabel}
          keep-open
        >
          <ha-checkbox
            slot="start"
            .checked=${selected}
            .indeterminate=${partial}
            reducedTouchTarget
          ></ha-checkbox>
          <ha-label style=${color ? `--color: ${color}` : ""}>
            ${label.icon
              ? html`<ha-icon slot="icon" .icon=${label.icon}></ha-icon>`
              : nothing}
            ${label.name}
          </ha-label>
        </ha-md-menu-item>`;
      })}
      <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
      <ha-md-menu-item .clickAction=${this._bulkCreateLabel}>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.labels.add_label")}
        </div></ha-md-menu-item
      >`;

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${
          this._searchParms.has("historyBack") ? undefined : "/config"
        }
        .route=${this.route}
        .tabs=${configSections.devices}
        .columns=${this._columns(this.hass.localize)}
        .data=${filteredEntities}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.entities.picker.search",
          { number: filteredEntities.length }
        )}
        has-filters
        .filters=${
          Object.values(this._filters).filter((filter) =>
            Array.isArray(filter)
              ? filter.length
              : filter &&
                Object.values(filter).some((val) =>
                  Array.isArray(val) ? val.length : val
                )
          ).length
        }
        selectable
        .selected=${this._selected.length}
        .initialGroupColumn=${this._activeGrouping ?? "device_full"}
        .initialCollapsedGroups=${this._activeCollapsed}
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @sorting-changed=${this._handleSortingChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        @selection-changed=${this._handleSelectionChanged}
        clickable
        @clear-filter=${this._clearFilter}
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._openEditEntry}
        id="entity_id"
        .hasFab=${includeAddDeviceFab}
        class=${this.narrow ? "narrow" : ""}
      >
        <ha-integration-overflow-menu
          .hass=${this.hass}
          slot="toolbar-icon"
        ></ha-integration-overflow-menu>


${
  !this.narrow
    ? html`<ha-md-button-menu slot="selection-bar">
        <ha-assist-chip
          slot="trigger"
          .label=${this.hass.localize(
            "ui.panel.config.automation.picker.bulk_actions.add_label"
          )}
        >
          <ha-svg-icon slot="trailing-icon" .path=${mdiMenuDown}></ha-svg-icon>
        </ha-assist-chip>
        ${labelItems}
      </ha-md-button-menu>`
    : nothing
}
<ha-md-button-menu has-overflow slot="selection-bar">
  ${
    this.narrow
      ? html`<ha-assist-chip
          .label=${this.hass.localize(
            "ui.panel.config.automation.picker.bulk_action"
          )}
          slot="trigger"
        >
          <ha-svg-icon slot="trailing-icon" .path=${mdiMenuDown}></ha-svg-icon>
        </ha-assist-chip>`
      : html`<ha-icon-button
          .path=${mdiDotsVertical}
          .label=${this.hass.localize(
            "ui.panel.config.automation.picker.bulk_action"
          )}
          slot="trigger"
        ></ha-icon-button>`
  }
    <ha-svg-icon
      slot="trailing-icon"
      .path=${mdiMenuDown}
    ></ha-svg-icon
  ></ha-assist-chip>
  ${
    this.narrow
      ? html`<ha-sub-menu>
            <ha-md-menu-item slot="item">
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.automation.picker.bulk_actions.add_label"
                )}
              </div>
              <ha-svg-icon slot="end" .path=${mdiChevronRight}></ha-svg-icon>
            </ha-md-menu-item>
            <ha-md-menu slot="menu">${labelItems}</ha-md-menu>
          </ha-sub-menu>
          <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>`
      : nothing
  }

  ${renderDisableableMenuItem(
    this._enableSelected,
    mdiToggleSwitch,
    "ui.panel.config.entities.picker.enable_selected.button"
  )}
  ${renderDisableableMenuItem(
    this._disableSelected,
    mdiToggleSwitchOffOutline,
    "ui.panel.config.entities.picker.disable_selected.button"
  )}
  <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

  ${renderDisableableMenuItem(
    this._unhideSelected,
    mdiEye,
    "ui.panel.config.entities.picker.unhide_selected.button"
  )}
  ${renderDisableableMenuItem(
    this._hideSelected,
    mdiEyeOff,
    "ui.panel.config.entities.picker.hide_selected.button"
  )}

  <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

  ${
    isComponentLoaded(this.hass, "recorder")
      ? html`
          <ha-md-menu-item .clickAction=${this._enableRecordingSelected}>
            <ha-svg-icon slot="start" .path=${mdiToggleSwitch}></ha-svg-icon>
            <div slot="headline">
              ${this.hass.localize(
                "ui.panel.config.entities.picker.enable_recording_selected.button"
              )}
            </div>
          </ha-md-menu-item>
          <ha-md-menu-item .clickAction=${this._disableRecordingSelected}>
            <ha-svg-icon
              slot="start"
              .path=${mdiToggleSwitchOffOutline}
            ></ha-svg-icon>
            <div slot="headline">
              ${this.hass.localize(
                "ui.panel.config.entities.picker.disable_recording_selected.button"
              )}
            </div>
          </ha-md-menu-item>

          <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>
        `
      : ""
  }

  ${renderDisableableMenuItem(
    this._restoreEntityIdSelected,
    mdiRestore,
    "ui.panel.config.entities.picker.restore_entity_id_selected.button"
  )}

  <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

  ${renderDisableableMenuItem(
    this._removeSelected,
    mdiDelete,
    "ui.panel.config.entities.picker.delete_selected.button",
    true // warning style
  )}

</ha-md-button-menu>
        ${
          Array.isArray(this._filters.config_entry) &&
          this._filters.config_entry.length
            ? html`<ha-alert slot="filter-pane">
                ${this.hass.localize(
                  "ui.panel.config.entities.picker.filtering_by_config_entry"
                )}
                ${this._entries?.find(
                  (entry) => entry.entry_id === this._filters.config_entry![0]
                )?.title || this._filters.config_entry[0]}${this._filters
                  .config_entry.length === 1 &&
                Array.isArray(this._filters.sub_entry) &&
                this._filters.sub_entry.length
                  ? html` (${this._subEntries?.find(
                      (entry) =>
                        entry.subentry_id === this._filters.sub_entry![0]
                    )?.title || this._filters.sub_entry[0]})`
                  : nothing}
              </ha-alert>`
            : nothing
        }
        <ha-filter-floor-areas
          .hass=${this.hass}
          type="entity"
          .value=${this._filters["ha-filter-floor-areas"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-floor-areas"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-floor-areas>
        <ha-filter-devices
          .hass=${this.hass}
          .type=${"entity"}
          .value=${this._filters["ha-filter-devices"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-devices"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-devices>
        <ha-filter-domains
          .hass=${this.hass}
          .value=${this._filters["ha-filter-domains"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-domains"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-domains>
        <ha-filter-integrations
          .hass=${this.hass}
          .value=${this._filters["ha-filter-integrations"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-integrations"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-integrations>
        <ha-filter-states
          .hass=${this.hass}
          .label=${this.hass.localize(
            "ui.panel.config.entities.picker.headers.status"
          )}
          .value=${this._filters["ha-filter-states"]}
          .states=${this._states(this.hass.localize)}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-states"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-states>
        <ha-filter-labels
          .hass=${this.hass}
          .value=${this._filters["ha-filter-labels"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-labels"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-labels>
        ${
          includeAddDeviceFab
            ? html`<ha-fab
                .label=${this.hass.localize(
                  "ui.panel.config.devices.add_device"
                )}
                extended
                @click=${this._addDevice}
                slot="fab"
              >
                <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
              </ha-fab>`
            : nothing
        }
      </hass-tabs-subpage-data-table>
    `;
  }

  private _filterExpanded(ev) {
    if (ev.detail.expanded) {
      this._expandedFilter = ev.target.localName;
    } else if (this._expandedFilter === ev.target.localName) {
      this._expandedFilter = undefined;
    }
  }

  private _filterChanged(ev) {
    const type = ev.target.localName;

    this._filters = { ...this._filters, [type]: ev.detail.value };
    this._filteredItems = { ...this._filteredItems, [type]: ev.detail.items };
  }

  protected firstUpdated() {
    this._setFiltersFromUrl();
    fetchEntitySourcesWithCache(this.hass).then((sources) => {
      this._entitySources = sources;
    });

    // Fetch recording data if the column is visible
    if (!this._activeHiddenColumns?.includes("recorded")) {
      this._fetchRecordingData();
    }

    if (Object.keys(this._filters).length) {
      return;
    }
    this._filters = {
      "ha-filter-states": ["enabled"],
    };
  }

  private _setFiltersFromUrl() {
    const domain = this._searchParms.get("domain");
    const configEntry = this._searchParms.get("config_entry");
    const subEntry = this._searchParms.get("sub_entry");
    const device = this._searchParms.get("device");
    const label = this._searchParms.get("label");

    if (!domain && !configEntry && !label && !device) {
      return;
    }

    this._filter = history.state?.filter || "";

    this._filters = {
      "ha-filter-states": [],
      "ha-filter-integrations": domain ? [domain] : [],
      "ha-filter-devices": device ? [device] : [],
      "ha-filter-labels": label ? [label] : [],
      config_entry: configEntry ? [configEntry] : [],
      sub_entry: subEntry ? [subEntry] : [],
    };
  }

  private _clearFilter() {
    this._filters = {};
    this._filteredItems = {};
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._setFiltersFromUrl();
    }

    const oldHass = changedProps.get("hass");
    let changed = false;
    if (!this.hass || !this._entities) {
      return;
    }

    if (
      (changedProps.has("hass") &&
        (!oldHass || oldHass.states !== this.hass.states)) ||
      changedProps.has("_entities") ||
      changedProps.has("_entitySources")
    ) {
      // Re-fetch recording data when entities change
      if (
        changedProps.has("_entities") &&
        this._recordingEntities &&
        !this._activeHiddenColumns?.includes("recorded")
      ) {
        this._fetchRecordingData();
      }
      const stateEntities: StateEntity[] = [];
      const regEntityIds = new Set(
        this._entities.map((entity) => entity.entity_id)
      );
      for (const entityId of Object.keys(this.hass.states)) {
        if (regEntityIds.has(entityId)) {
          continue;
        }
        if (
          changedProps.has("_entitySources") ||
          (changedProps.has("hass") && (!oldHass || !oldHass.states[entityId]))
        ) {
          changed = true;
        }
        stateEntities.push({
          name: computeStateName(this.hass.states[entityId]),
          entity_id: entityId,
          platform:
            this._entitySources?.[entityId]?.domain || computeDomain(entityId),
          disabled_by: null,
          hidden_by: null,
          area_id: null,
          config_entry_id: null,
          config_subentry_id: null,
          device_id: null,
          icon: null,
          readonly: true,
          selectable: true,
          entity_category: null,
          has_entity_name: false,
          options: null,
          labels: [],
          categories: {},
          created_at: 0,
          modified_at: 0,
        });
      }
      if (changed) {
        this._stateEntities = stateEntities;
      }
    }
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
    history.replaceState({ filter: this._filter }, "");
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  private _enableSelected = async () => {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.entities.picker.enable_selected.confirm_title",
        { number: this._selected.length }
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.enable_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.enable"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: async () => {
        let require_restart = false;
        let reload_delay = 0;
        const result = await Promise.allSettled(
          this._selected.map(async (entity) => {
            const updateResult = await updateEntityRegistryEntry(
              this.hass,
              entity,
              {
                disabled_by: null,
              }
            );
            if (updateResult.require_restart) {
              require_restart = true;
            }
            if (updateResult.reload_delay) {
              reload_delay = Math.max(reload_delay, updateResult.reload_delay);
            }
          })
        );

        if (hasRejectedItems(result)) {
          const rejected = rejectedItems(result);
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.common.multiselect.failed",
              {
                number: rejected.length,
              }
            ),
            text: html`<pre>
    ${rejected
                .map((r) => r.reason.message || r.reason.code || r.reason)
                .join("\r\n")}</pre
            >`,
          });
        }

        this._clearSelection();
        // If restart is required by any entity, show a dialog.
        // Otherwise, show a dialog explaining that some patience is needed
        if (require_restart) {
          showAlertDialog(this, {
            text: this.hass.localize(
              "ui.dialogs.entity_registry.editor.enabled_restart_confirm"
            ),
          });
        } else if (reload_delay) {
          showAlertDialog(this, {
            text: this.hass.localize(
              "ui.dialogs.entity_registry.editor.enabled_delay_confirm",
              { delay: reload_delay }
            ),
          });
        }
      },
    });
  };

  private _disableSelected = () => {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.entities.picker.disable_selected.confirm_title",
        { number: this._selected.length }
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.disable_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.disable"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: () => {
        this._selected.forEach((entity) =>
          updateEntityRegistryEntry(this.hass, entity, {
            disabled_by: "user",
          })
        );
        this._clearSelection();
      },
    });
  };

  private _hideSelected = () => {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.entities.picker.hide_selected.confirm_title",
        { number: this._selected.length }
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.hide_selected.confirm"
      ),
      confirmText: this.hass.localize("ui.common.hide"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: () => {
        this._selected.forEach((entity) =>
          updateEntityRegistryEntry(this.hass, entity, {
            hidden_by: "user",
          })
        );
        this._clearSelection();
      },
    });
  };

  private _unhideSelected = () => {
    this._selected.forEach((entity) =>
      updateEntityRegistryEntry(this.hass, entity, {
        hidden_by: null,
      })
    );
    this._clearSelection();
  };

  private _enableRecordingSelected = async () => {
    if (!isComponentLoaded(this.hass, "recorder")) {
      return;
    }

    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.entities.picker.enable_recording_selected.confirm_title",
        { number: this._selected.length }
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.enable_recording_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.enable"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: async () => {
        try {
          await setEntityRecordingOptions(
            this.hass,
            this._selected,
            null // null means recording is enabled
          );

          // Re-fetch recording data to update the table
          if (this._recordingEntities) {
            await this._fetchRecordingData();
          }
        } catch (err: any) {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.common.multiselect.failed",
              {
                number: this._selected.length,
              }
            ),
            text: err.message,
          });
        }
      },
    });
  };

  private _disableRecordingSelected = async () => {
    if (!isComponentLoaded(this.hass, "recorder")) {
      return;
    }

    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.entities.picker.disable_recording_selected.confirm_title",
        { number: this._selected.length }
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.disable_recording_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.disable"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: async () => {
        try {
          await setEntityRecordingOptions(
            this.hass,
            this._selected,
            "user" // "user" means disabled by user
          );

          // Re-fetch recording data to update the table
          if (this._recordingEntities) {
            await this._fetchRecordingData();
          }
        } catch (err: any) {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.common.multiselect.failed",
              {
                number: this._selected.length,
              }
            ),
            text: err.message,
          });
        }
      },
    });
  };

  private async _handleBulkLabel(ev) {
    const label = ev.currentTarget.value;
    const action = ev.currentTarget.action;
    await this._bulkLabel(label, action);
  }

  private async _bulkLabel(label: string, action: "add" | "remove") {
    const promises: Promise<UpdateEntityRegistryEntryResult>[] = [];
    this._selected.forEach((entityId) => {
      const entityReg =
        this.hass.entities[entityId] ||
        this._entities.find((entReg) => entReg.entity_id === entityId);
      if (!entityReg) {
        return;
      }
      promises.push(
        updateEntityRegistryEntry(this.hass, entityId, {
          labels:
            action === "add"
              ? entityReg.labels.concat(label)
              : entityReg.labels.filter((lbl) => lbl !== label),
        })
      );
    });
    const result = await Promise.allSettled(promises);
    if (hasRejectedItems(result)) {
      const rejected = rejectedItems(result);
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.common.multiselect.failed", {
          number: rejected.length,
        }),
        text: html`<pre>
${rejected
            .map((r) => r.reason.message || r.reason.code || r.reason)
            .join("\r\n")}</pre
        >`,
      });
    }
  }

  private _bulkCreateLabel = () => {
    showLabelDetailDialog(this, {
      createEntry: async (values) => {
        const label = await createLabelRegistryEntry(this.hass, values);
        this._bulkLabel(label.label_id, "add");
      },
    });
  };

  private _restoreEntityIdSelected = () => {
    regenerateEntityIds(this, this.hass, this._selected);

    this._clearSelection();
  };

  private _removeSelected = async () => {
    if (!this._entities || !this.hass) {
      return;
    }

    const manifestsProm = this._manifests
      ? undefined
      : fetchIntegrationManifests(this.hass);
    const helperDomains = [
      ...new Set(this._selected.map((s) => computeDomain(s))),
    ].filter((d) => isHelperDomain(d));

    const configEntriesProm = this._entries
      ? undefined
      : this._loadConfigEntries();
    const domainProms = helperDomains.map((d) =>
      HELPERS_CRUD[d].fetch(this.hass)
    );
    const helpersResult = await Promise.all(domainProms);
    let fetchedHelpers: Helper[] = [];
    helpersResult.forEach((r) => {
      fetchedHelpers = fetchedHelpers.concat(r);
    });
    if (manifestsProm) {
      this._manifests = await manifestsProm;
    }
    if (configEntriesProm) {
      await configEntriesProm;
    }

    const removeableEntities = this._selected.filter((entity_id) =>
      isDeletableEntity(
        this.hass,
        entity_id,
        this._manifests!,
        this._entities,
        this._entries!,
        fetchedHelpers
      )
    );
    showConfirmationDialog(this, {
      title: this.hass.localize(
        `ui.panel.config.entities.picker.delete_selected.confirm_title`
      ),
      text:
        removeableEntities.length === this._selected.length
          ? this.hass.localize(
              "ui.panel.config.entities.picker.delete_selected.confirm_text"
            )
          : this.hass.localize(
              "ui.panel.config.entities.picker.delete_selected.confirm_partly_text",
              {
                deletable: removeableEntities.length,
                selected: this._selected.length,
              }
            ),
      confirmText: this.hass.localize("ui.common.delete"),
      dismissText: this.hass.localize("ui.common.cancel"),
      destructive: true,
      confirm: () => {
        removeableEntities.forEach((entity_id) =>
          deleteEntity(
            this.hass,
            entity_id,
            this._manifests!,
            this._entities,
            this._entries!,
            fetchedHelpers
          )
        );
        this._clearSelection();
      },
    });
  };

  private _clearSelection() {
    this._dataTable.clearSelection();
  }

  private _openEditEntry(ev: CustomEvent): void {
    const entityId = (ev.detail as RowClickedEvent).id;
    showMoreInfoDialog(this, { entityId });
  }

  private async _loadConfigEntries() {
    this._entries = await getConfigEntries(this.hass);
  }

  private async _loadSubEntries(entryId: string) {
    this._subEntries = await getSubEntries(this.hass, entryId);
  }

  private _addDevice() {
    const { filteredConfigEntry, filteredDomains } =
      this._filteredEntitiesAndDomains(
        this.hass.localize,
        this._entities!,
        this.hass.devices,
        this.hass.areas,
        this._stateEntities,
        this._filters,
        this._filteredItems,
        this._entries,
        this._labels,
        this._recordingEntities
      );
    if (
      filteredDomains.size === 1 &&
      (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
        [...filteredDomains][0]
      )
    ) {
      protocolIntegrationPicked(this, this.hass, [...filteredDomains][0], {
        config_entry: filteredConfigEntry?.entry_id,
      });
      return;
    }
    showAddIntegrationDialog(this, {
      domain: this._searchParms.get("domain") || undefined,
    });
  }

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  private async _fetchRecordingData() {
    if (!isComponentLoaded(this.hass, "recorder")) {
      return;
    }

    try {
      this._recordingEntities = await getEntityRecordingList(this.hass);
    } catch (_err) {
      // Silently fail - recording data is optional
    }
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;

    // Check if the recorded column is now visible
    if (
      !this._activeHiddenColumns?.includes("recorded") &&
      !this._recordingEntities
    ) {
      this._fetchRecordingData();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 56px;
          background-color: var(--mdc-text-field-fill-color, whitesmoke);
          border-bottom: 1px solid
            var(--mdc-text-field-idle-line-color, rgba(0, 0, 0, 0.42));
          box-sizing: border-box;
        }
        .header-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--secondary-text-color);
          position: relative;
          top: -4px;
        }
        .selected-txt {
          font-weight: var(--ha-font-weight-bold);
          padding-left: 16px;
          padding-inline-start: 16px;
          padding-inline-end: initial;
          direction: var(--direction);
        }
        .table-header .selected-txt {
          margin-top: 20px;
        }
        .header-toolbar .selected-txt {
          font-size: var(--ha-font-size-l);
        }
        .header-toolbar .header-btns {
          margin-right: -12px;
          margin-inline-end: -12px;
          margin-inline-start: initial;
          direction: var(--direction);
        }
        .header-btns {
          display: flex;
        }
        .header-btns > ha-icon-button {
          margin: 8px;
        }
        ha-button-menu {
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
        }
        .clear {
          color: var(--primary-color);
          padding-left: 8px;
          padding-inline-start: 8px;
          padding-inline-end: initial;
          text-transform: uppercase;
          direction: var(--direction);
        }

        ha-assist-chip {
          --ha-assist-chip-container-shape: 10px;
        }
        ha-md-button-menu ha-assist-chip {
          --md-assist-chip-trailing-space: 8px;
        }
        ha-label {
          --ha-label-background-color: var(--color, var(--grey-color));
          --ha-label-background-opacity: 0.5;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-entities": HaConfigEntities;
  }
}
