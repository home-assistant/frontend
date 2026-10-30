import { ResizeController } from "@lit-labs/observers/resize-controller";
import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiAlertCircle,
  mdiCancel,
  mdiDelete,
  mdiDotsVertical,
  mdiEye,
  mdiEyeOff,
  mdiMenuDown,
  mdiMicrophoneMessage,
  mdiMicrophoneMessageOff,
  mdiPencilOff,
  mdiPlus,
  mdiRestore,
  mdiRestoreAlert,
  mdiTextureBox,
  mdiToggleSwitch,
  mdiToggleSwitchOffOutline,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoize from "memoize-one";
import { DataTableSettingsController } from "../../../common/controllers/data-table-settings-controller";
import { QueryParamsController } from "../../../common/controllers/query-params-controller";
import { consume } from "../../../common/decorators/consume";
import { storage } from "../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeAreaName } from "../../../common/entity/compute_area_name";
import {
  computeDeviceName,
  getDuplicatedDeviceNames,
} from "../../../common/entity/compute_device_name";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeEntityEntryName } from "../../../common/entity/compute_entity_name_display";
import { isEmptyEntityDomainFilter } from "../../../common/entity/entity_domain_filter";
import {
  deleteEntity,
  isDeletableEntity,
} from "../../../common/entity/delete_entity";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { slugify } from "../../../common/string/slugify";
import type { LocalizeFunc } from "../../../common/translations/localize";
import {
  entitiesFilterQueryParamConfig,
  entitiesFilterQueryParams,
  entitiesFilterQueryString,
  entitiesLinkFromUrl,
} from "../../../common/url/entities-query-params";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../../common/util/promise-all-settled-results";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-labels";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-entity-id-icon";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-domains";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-integrations";
import "../../../components/ha-filter-labels";
import "../../../components/ha-filter-states";
import "../../../components/ha-filter-voice-assistants";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import { createAreaRegistryEntry } from "../../../data/area/area_registry";
import type { CloudStatus } from "../../../data/cloud";
import type { ConfigEntry, SubEntry } from "../../../data/config_entries";
import { getConfigEntries, getSubEntries } from "../../../data/config_entries";
import { fullEntitiesContext, labelsContext } from "../../../data/context";
import type {
  DataTableFiltersItems,
  DataTableFiltersValues,
} from "../../../data/data_table_filters";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type {
  EntityRegistryEntry,
  EntityRegistryOptions,
  UpdateEntityRegistryEntryResult,
} from "../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { EntitySources } from "../../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../../data/entity/entity_sources";
import type { ExposeEntitySettings } from "../../../data/expose";
import {
  exposeEntities,
  listExposedEntities,
  voiceAssistants,
} from "../../../data/expose";
import { HELPERS_CRUD } from "../../../data/helpers_crud";
import type { IntegrationManifest } from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifests,
} from "../../../data/integration";
import type { LabelRegistryEntry } from "../../../data/label/label_registry";
import { createLabelRegistryEntry } from "../../../data/label/label_registry";
import { regenerateEntityIds } from "../../../data/regenerate_entity_ids";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { showToast } from "../../../util/toast";
import {
  getAreaTableColumn,
  getCreatedAtTableColumn,
  getDomainTableColumn,
  getEntityIdTableColumn,
  getLabelsTableColumn,
  getModifiedAtTableColumn,
} from "../common/data-table-columns";
import { showAreaRegistryDetailDialog } from "../areas/show-dialog-area-registry-detail";
import { configSections } from "../config-sections";
import type { Helper } from "../helpers/const";
import { isHelperDomain } from "../helpers/const";
import "../integrations/ha-integration-overflow-menu";
import { showAddIntegrationDialog } from "../integrations/show-add-integration-dialog";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";
import {
  getAssistantsSortableKey,
  getAssistantsTableColumn,
} from "../voice-assistants/expose/assistants-table-column";
import { getAvailableAssistants } from "../voice-assistants/expose/available-assistants";

const EXPOSE_TOAST_ID = "entities-expose";

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

// Local variant of data/expose/getExposedEntityVoiceAssistantIds, which works
// for entities both with and without a unique ID
const getVoiceAssistantIds = (
  exposedEntities: Record<string, ExposeEntitySettings> | undefined,
  entityId: string
) =>
  Object.keys(voiceAssistants).filter(
    (vaId) => exposedEntities?.[entityId]?.[vaId]
  );

@customElement("ha-config-entities")
export class HaConfigEntities extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @state() private _entries?: ConfigEntry[];

  @state() private _subEntries?: SubEntry[];

  @state() private _manifests?: IntegrationManifest[];

  // does NOT contain the entities without unique id (e.g. Sun)
  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entities!: EntityRegistryEntry[];

  @state() private _entitiesWithoutUniqueId: StateEntity[] = [];

  // entities exposed to one or more voice assistants,
  // including entities without unique id
  @state() private _exposedEntities?: Record<string, ExposeEntitySettings>;

  private _tableSettings = new DataTableSettingsController(
    this,
    {
      search: "entities-table-search",
      sorting: "entities-table-sort",
      grouping: "entities-table-grouping",
    },
    { defaultGrouping: "device_full" }
  );

  @state()
  private _filters: DataTableFiltersValues = {};

  @storage({
    storage: "sessionStorage",
    key: "entities-table-filters",
    state: false,
    subscribe: false,
  })
  private _storageFilters: DataTableFiltersValues = {};

  @state() private _filteredItems: DataTableFiltersItems = {};

  @state() private _selected: string[] = [];

  @state() private _expandedFilter?: string;

  @consume({ context: labelsContext, subscribe: true })
  @state()
  _labels?: LabelRegistryEntry[];

  @state() private _entitySources?: EntitySources;

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

  private get _availableAssistants() {
    return getAvailableAssistants(this.cloudStatus, this.hass);
  }

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  private _sizeController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width,
  });

  // The filters are kept in the URL by the page, the search, sorting and
  // grouping by the table
  private _filterParams = new QueryParamsController(
    this,
    entitiesFilterQueryParamConfig,
    {
      enabled: () => true,
      navigated: () => this._applyLink(),
    }
  );

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      "exposed-entities-changed",
      this._fetchExposedEntities
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(
      "exposed-entities-changed",
      this._fetchExposedEntities
    );
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
      entitiesToCheck?: any[]
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
            : html`
                <ha-entity-id-icon
                  state-title
                  slot="item-icon"
                  .entityId=${entry.entity_id}
                ></ha-entity-id-icon>
              `,
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
        urlName: "device",
        hidden: true,
      },
      area: getAreaTableColumn(localize),
      entity_id: getEntityIdTableColumn(localize, true),
      localized_platform: {
        title: localize("ui.panel.config.entities.picker.headers.integration"),
        sortable: true,
        groupable: true,
        urlName: "integration",
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
                    .path=${
                      entry.restored
                        ? mdiRestoreAlert
                        : entry.unavailable
                          ? mdiAlertCircle
                          : entry.disabled_by
                            ? mdiCancel
                            : entry.hidden_by
                              ? mdiEyeOff
                              : mdiPencilOff
                    }
                  ></ha-svg-icon>

                  <ha-tooltip
                    .for="status-icon-${slugify(entry.entity_id)}"
                    placement="left"
                  >
                    ${
                      entry.restored
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
                                )
                    }
                  </ha-tooltip>
                </div>
              `
            : "—",
      },
      created_at: getCreatedAtTableColumn(localize, this.hass),
      modified_at: getModifiedAtTableColumn(localize, this.hass),
      available: {
        title: localize("ui.panel.config.entities.picker.headers.availability"),
        sortable: true,
        groupable: true,
        urlName: "available",
        hidden: true,
      },
      visible: {
        title: localize("ui.panel.config.entities.picker.headers.visibility"),
        sortable: true,
        groupable: true,
        urlName: "visible",
        hidden: true,
      },
      enabled: {
        title: localize("ui.panel.config.entities.picker.headers.enabled"),
        sortable: true,
        groupable: true,
        urlName: "enabled",
        hidden: true,
      },
      labels: getLabelsTableColumn(),
      assistants: getAssistantsTableColumn(
        localize,
        this.hass,
        this._availableAssistants,
        entitiesToCheck
      ),
    })
  );

  private _filteredEntitiesAndDomains = memoize(
    (
      localize: LocalizeFunc,
      entities: StateEntity[],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"],
      entitiesWithoutUniqueId: StateEntity[],
      filters: DataTableFiltersValues,
      filteredItems: DataTableFiltersItems,
      exposedEntities?: Record<string, ExposeEntitySettings>,
      entries?: ConfigEntry[],
      labelReg?: LabelRegistryEntry[]
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

      // take both entities with and without unique id into account
      let filteredEntities = entities.concat(entitiesWithoutUniqueId);

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
          const configEntryIds = this._filters.config_entry;

          if (!Array.isArray(configEntryIds) || !configEntryIds.length) {
            return;
          }

          filteredEntities = filteredEntities.filter(
            (entity) =>
              entity.config_subentry_id &&
              (filter as string[]).includes(entity.config_subentry_id)
          );

          // The titles shown in the filter chip need a single config entry
          if (configEntryIds.length === 1 && !this._subEntries) {
            this._loadSubEntries(configEntryIds[0]);
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
        } else if (
          key === "ha-filter-voice-assistants" &&
          Array.isArray(filter) &&
          filter.length
        ) {
          filteredEntities = filteredEntities.filter((entity) =>
            getVoiceAssistantIds(exposedEntities, entity.entity_id).some((va) =>
              (filter as string[]).includes(va)
            )
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

        const labels = labelReg && entry?.labels;
        const labelsEntries = (labels || [])
          .map((lbl) => labelReg!.find((label) => label.label_id === lbl))
          .filter((lbl): lbl is LabelRegistryEntry => lbl !== undefined);

        const entityName = computeEntityEntryName(entry as EntityRegistryEntry);

        const deviceName = device ? computeDeviceName(device) : undefined;
        const areaName = area ? computeAreaName(area) : undefined;
        const deviceFullName = deviceName
          ? duplicatedDevicesNames.has(deviceName) && areaName
            ? `${deviceName} (${areaName})`
            : deviceName
          : undefined;

        const assistants = getVoiceAssistantIds(
          exposedEntities,
          entry.entity_id
        );

        result.push({
          ...entry,
          name:
            entityName ||
            deviceName ||
            (entity ? this.hass.formatEntityName(entity) : entry.entity_id),
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

  private _renderLabelItems = (slot = "") =>
    html`${this._labels?.map((label) => {
        const selected = this._selected.every((entityId) =>
          this.hass.entities[entityId]?.labels.includes(label.label_id)
        );
        const partial =
          !selected &&
          this._selected.some((entityId) =>
            this.hass.entities[entityId]?.labels.includes(label.label_id)
          );
        return html`<ha-dropdown-item
          .slot=${slot}
          .value=${`label_${label.label_id}`}
          .action=${selected ? "remove" : "add"}
        >
          <ha-checkbox
            slot="icon"
            .checked=${selected}
            .indeterminate=${partial}
          ></ha-checkbox>
          <ha-label
            .color=${label.color}
            .description=${label.description}
            class="text-ellipsis"
          >
            ${
              label.icon
                ? html`<ha-icon slot="icon" .icon=${label.icon}></ha-icon>`
                : nothing
            }
            ${label.name}
          </ha-label>
        </ha-dropdown-item>`;
      })}
      <wa-divider .slot=${slot}></wa-divider>
      <ha-dropdown-item .slot=${slot} value="label_create">
        ${this.hass.localize("ui.panel.config.labels.add_label")}
      </ha-dropdown-item>`;

  private _renderAreaItems = (slot = "") =>
    html`${Object.values(this.hass.areas).map(
        (area) =>
          html`<ha-dropdown-item .slot=${slot} .value=${`area_${area.area_id}`}>
            ${
              area.icon
                ? html`<ha-icon slot="icon" .icon=${area.icon}></ha-icon>`
                : html`<ha-svg-icon
                    slot="icon"
                    .path=${mdiTextureBox}
                  ></ha-svg-icon>`
            }
            ${area.name}
          </ha-dropdown-item>`
      )}
      <ha-dropdown-item .slot=${slot} value="area_none">
        ${
          // Clearing the area of a device entity falls back to the device area
          this._selected.some(
            (entityId) => this.hass.entities[entityId]?.device_id
          )
            ? this.hass.localize(
                "ui.dialogs.entity_registry.editor.use_device_area"
              )
            : this.hass.localize(
                "ui.panel.config.devices.picker.bulk_actions.no_area"
              )
        }
      </ha-dropdown-item>
      <wa-divider .slot=${slot}></wa-divider>
      <ha-dropdown-item .slot=${slot} value="area_create">
        ${this.hass.localize(
          "ui.panel.config.devices.picker.bulk_actions.add_area"
        )}
      </ha-dropdown-item>`;

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
        this._entitiesWithoutUniqueId,
        this._filters,
        this._filteredItems,
        this._exposedEntities,
        this._entries,
        this._labels
      );

    const exposableAssistants = this._exposableAssistants(
      this.cloudStatus,
      this.hass
    );

    const areasInOverflow =
      (this._sizeController.value && this._sizeController.value < 700) ||
      (!this._sizeController.value && this.hass.dockedSidebar === "docked");

    const includeAddDeviceFab =
      filteredDomains.size === 1 &&
      (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
        [...filteredDomains][0]
      );

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.devices}
        .columns=${this._columns(this.hass.localize, filteredEntities)}
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
        .initialGroupColumn=${this._tableSettings.grouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .initialSorting=${this._tableSettings.sorting}
        .columnOrder=${this._activeColumnOrder}
        .hiddenColumns=${this._activeHiddenColumns}
        @columns-changed=${this._handleColumnsChanged}
        @sorting-changed=${this._tableSettings.sortingChanged}
        @grouping-changed=${this._tableSettings.groupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        @selection-changed=${this._handleSelectionChanged}
        clickable
        sync-url
        @clear-filter=${this._clearFilter}
        .filter=${this._tableSettings.search}
        @search-changed=${this._tableSettings.searchChanged}
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
            ? html`<ha-dropdown
                  slot="selection-bar"
                  @wa-select=${this._handleBulkLabel}
                >
                  <ha-assist-chip
                    slot="trigger"
                    .label=${this.hass.localize(
                      "ui.panel.config.automation.picker.bulk_actions.add_label"
                    )}
                  >
                    <ha-svg-icon
                      slot="trailing-icon"
                      .path=${mdiMenuDown}
                    ></ha-svg-icon>
                  </ha-assist-chip>
                  ${this._renderLabelItems()}
                </ha-dropdown>
                ${
                  areasInOverflow
                    ? nothing
                    : html`<ha-dropdown
                        slot="selection-bar"
                        @wa-select=${this._handleBulkArea}
                      >
                        <ha-assist-chip
                          slot="trigger"
                          .label=${this.hass.localize(
                            "ui.panel.config.devices.picker.bulk_actions.move_area"
                          )}
                        >
                          <ha-svg-icon
                            slot="trailing-icon"
                            .path=${mdiMenuDown}
                          ></ha-svg-icon>
                        </ha-assist-chip>
                        ${this._renderAreaItems()}
                      </ha-dropdown>`
                }`
            : nothing
        }
        <ha-dropdown slot="selection-bar" @wa-select=${this._handleBulkAction}>
          ${
            this.narrow
              ? html`<ha-assist-chip
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.picker.bulk_action"
                  )}
                  slot="trigger"
                >
                  <ha-svg-icon
                    slot="trailing-icon"
                    .path=${mdiMenuDown}
                  ></ha-svg-icon>
                </ha-assist-chip>`
              : html`<ha-icon-button
                  .path=${mdiDotsVertical}
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.picker.bulk_action"
                  )}
                  slot="trigger"
                ></ha-icon-button>`
          }
          ${
            this.narrow
              ? html`<ha-dropdown-item>
                    ${this.hass.localize(
                      "ui.panel.config.automation.picker.bulk_actions.add_label"
                    )}
                    <ha-icon-next slot="end"></ha-icon-next>
                    ${this._renderLabelItems("submenu")}
                  </ha-dropdown-item>
                  <wa-divider></wa-divider>`
              : nothing
          }
          ${
            this.narrow || areasInOverflow
              ? html`<ha-dropdown-item>
                    ${this.hass.localize(
                      "ui.panel.config.devices.picker.bulk_actions.move_area"
                    )}
                    ${this._renderAreaItems("submenu")}
                  </ha-dropdown-item>
                  <wa-divider></wa-divider>`
              : nothing
          }

          <ha-dropdown-item value="enable_selected">
            <ha-svg-icon slot="icon" .path=${mdiToggleSwitch}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.entities.picker.enable_selected.button"
            )}
          </ha-dropdown-item>
          <ha-dropdown-item value="disable_selected">
            <ha-svg-icon
              slot="icon"
              .path=${mdiToggleSwitchOffOutline}
            ></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.entities.picker.disable_selected.button"
            )}
          </ha-dropdown-item>
          <wa-divider></wa-divider>

          <ha-dropdown-item value="unhide_selected">
            <ha-svg-icon slot="icon" .path=${mdiEye}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.entities.picker.unhide_selected.button"
            )}
          </ha-dropdown-item>
          <ha-dropdown-item value="hide_selected">
            <ha-svg-icon slot="icon" .path=${mdiEyeOff}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.entities.picker.hide_selected.button"
            )}
          </ha-dropdown-item>

          <wa-divider></wa-divider>

          ${
            exposableAssistants.length
              ? html`<ha-dropdown-item>
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiMicrophoneMessage}
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.config.entities.picker.expose_selected.button"
                    )}
                    ${this._renderVoiceAssistantItems(
                      "expose",
                      exposableAssistants
                    )}
                  </ha-dropdown-item>
                  <ha-dropdown-item>
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiMicrophoneMessageOff}
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.panel.config.entities.picker.unexpose_selected.button"
                    )}
                    ${this._renderVoiceAssistantItems(
                      "unexpose",
                      exposableAssistants
                    )}
                  </ha-dropdown-item>

                  <wa-divider></wa-divider>`
              : nothing
          }

          <ha-dropdown-item value="restore_entity_id_selected">
            <ha-svg-icon slot="icon" .path=${mdiRestore}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.entities.picker.restore_entity_id_selected.button"
            )}
          </ha-dropdown-item>

          <wa-divider></wa-divider>

          <ha-dropdown-item value="delete_selected" variant="danger">
            <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.entities.picker.delete_selected.button"
            )}
          </ha-dropdown-item>
        </ha-dropdown>
        ${
          Array.isArray(this._filters.config_entry) &&
          this._filters.config_entry.length
            ? html`<ha-alert slot="filter-pane">
                ${this.hass.localize(
                  "ui.panel.config.entities.picker.filtering_by_config_entry"
                )}
                ${
                  this._entries?.find(
                    (entry) => entry.entry_id === this._filters.config_entry![0]
                  )?.title || this._filters.config_entry[0]
                }${
                  this._filters.config_entry.length === 1 &&
                  Array.isArray(this._filters.sub_entry) &&
                  this._filters.sub_entry.length
                    ? html` (${
                        this._subEntries?.find(
                          (entry) =>
                            entry.subentry_id === this._filters.sub_entry![0]
                        )?.title || this._filters.sub_entry[0]
                      })`
                    : nothing
                }
              </ha-alert>`
            : nothing
        }
        <ha-filter-floor-areas
          type="entity"
          include-disabled-entities
          .value=${this._filters["ha-filter-floor-areas"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-floor-areas"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-floor-areas>
        <ha-filter-devices
          .type=${"entity"}
          include-disabled-entities
          .value=${this._filters["ha-filter-devices"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-devices"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-devices>
        <ha-filter-domains
          .value=${this._filters["ha-filter-domains"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-domains"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-domains>
        <ha-filter-integrations
          .value=${this._filters["ha-filter-integrations"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-integrations"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-integrations>
        <ha-filter-states
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
          .value=${this._filters["ha-filter-labels"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-labels"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-labels>
        <ha-filter-voice-assistants
          .value=${this._filters["ha-filter-voice-assistants"]}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-voice-assistants"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-voice-assistants>
        ${
          includeAddDeviceFab
            ? html`<ha-button size="l" @click=${this._addDevice} slot="fab">
                <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                ${this.hass.localize("ui.panel.config.devices.add_device")}
              </ha-button>`
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

    // A filter can still finish looking up its items after the page is left.
    // Keep them for when the page comes back, but leave the URL alone.
    if (!this.isConnected) {
      this._filteredItems = { ...this._filteredItems, [type]: ev.detail.items };

      return;
    }

    const filters = { ...this._filters, [type]: ev.detail.value };

    // A filter also sends the value it was given, once it has found its items.
    // Only a change to what the URL holds is the user's, so a link isn't stored.
    if (
      entitiesFilterQueryString(filters) !==
      entitiesFilterQueryString(this._filters)
    ) {
      this._storageFilters = {
        ...this._storedFilters(),
        // Storage drops an undefined value, which would bring back the default
        [type]:
          type === "ha-filter-states"
            ? (ev.detail.value ?? [])
            : ev.detail.value,
      };
    }

    this._filters = filters;
    this._filteredItems = { ...this._filteredItems, [type]: ev.detail.items };
    this._writeFilters();
  }

  protected firstUpdated() {
    this._fetchExposedEntities();
    fetchEntitySourcesWithCache(this.hass.callWS, this.hass.states).then(
      (sources) => {
        this._entitySources = sources;
      }
    );
  }

  // Links, like the ones on a device or integration page, say in the URL what
  // to show. The router keeps the page open, so a link can land on it.
  private _applyLink() {
    const searchParams = this._filterParams.searchParams();
    const link = searchParams ? entitiesLinkFromUrl(searchParams) : undefined;

    // Shown, but not stored as the user's choice
    if (link) {
      this._tableSettings.showSearch(link.search);
      this._filters = link.filters;
    } else if (searchParams?.toString() === "") {
      // Opened again without params, like from the sidebar. Written once the
      // table has seen the URL without params, so it restores what it stored
      this._filters = this._storedFilters();
      queueMicrotask(() => this._writeFilters());

      return;
    }

    this._writeFilters();
  }

  private _storedFilters(): DataTableFiltersValues {
    return Object.keys(this._storageFilters).length
      ? this._storageFilters
      : { "ha-filter-states": ["enabled"] };
  }

  private _writeFilters() {
    this._filterParams.write(entitiesFilterQueryParams(this._filters));
  }

  private _clearFilter() {
    this._filters = {};
    this._filteredItems = {};
    // Not empty, so the cleared status is kept instead of the default
    this._storageFilters = { "ha-filter-states": [] };
    this._writeFilters();
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

  private _getExposedEntitySettingsAsOptions(
    entityId: string
  ): EntityRegistryOptions {
    const exposeSettings: ExposeEntitySettings | undefined =
      this._exposedEntities?.[entityId];
    const options: EntityRegistryOptions = {};
    Object.keys(voiceAssistants).forEach((vaId) => {
      options[vaId] = {
        should_expose: exposeSettings?.[vaId],
      };
    });
    return options;
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._filters = this._storedFilters();
      this._applyLink();
    }

    const oldHass = changedProps.get("hass");
    let changed = false;
    if (!this.hass || !this._entities) {
      return;
    }

    // Only the *set* of entity ids matters for the list below. A plain state
    // value change on an existing entity cannot add an "entity without unique
    // id", so detecting a newly added entity lets us skip the (potentially
    // large) rebuild on every state update, which fires constantly.
    const stateEntityAdded =
      changedProps.has("hass") &&
      (!oldHass ||
        Object.keys(this.hass.states).some((id) => !(id in oldHass.states)));

    if (
      stateEntityAdded ||
      changedProps.has("_entities") ||
      changedProps.has("_entitySources") ||
      changedProps.has("_exposedEntities")
    ) {
      // represent all entities without unique id
      // (entities present in this.hass.states but not in fullEntitiesContext)
      // as StateEntities, so this component can treat them the same as the
      // entities with id
      const entitiesWithoutUniqueId: StateEntity[] = [];
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
        entitiesWithoutUniqueId.push({
          name: this.hass.formatEntityName(this.hass.states[entityId]),
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
          selectable: false,
          entity_category: null,
          has_entity_name: false,
          options: this._getExposedEntitySettingsAsOptions(entityId),
          labels: [],
          categories: {},
          created_at: 0,
          modified_at: 0,
        });
      }
      if (changed) {
        this._entitiesWithoutUniqueId = entitiesWithoutUniqueId;
      }
    }
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
                .join("\r\n")}</pre>`,
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

  private async _handleBulkLabel(ev: HaDropdownSelectEvent) {
    ev.preventDefault(); // Prevent the dropdown from closing

    const label = ev.detail.item.value;

    if (!label) {
      return;
    }

    if (label === "label_create") {
      this._bulkCreateLabel();
      return;
    }

    const labelId = label.substring(6);

    const action = (ev.detail.item as any).action;
    await this._bulkLabel(labelId, action);
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
            .join("\r\n")}</pre>`,
      });
    }
  }

  private _bulkCreateLabel = () => {
    showLabelDetailDialog(this, {
      createEntry: async (values) => {
        const label = await createLabelRegistryEntry(this.hass.callWS, values);
        this._bulkLabel(label.label_id, "add");
      },
    });
  };

  private _handleBulkArea(ev: HaDropdownSelectEvent) {
    const area = ev.detail.item.value;

    if (area === "area_create") {
      this._bulkCreateArea();
      return;
    }
    if (area === "area_none") {
      this._bulkAddArea(null);
      return;
    }
    if (area?.startsWith("area_")) {
      this._bulkAddArea(area.substring(5));
    }
  }

  private async _bulkAddArea(area: string | null) {
    const promises: Promise<UpdateEntityRegistryEntryResult>[] = [];
    this._selected.forEach((entityId) => {
      promises.push(
        updateEntityRegistryEntry(this.hass, entityId, {
          area_id: area,
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
            .join("\r\n")}</pre>`,
      });
    }
  }

  private _bulkCreateArea = () => {
    showAreaRegistryDetailDialog(this, {
      createEntry: async (values) => {
        const area = await createAreaRegistryEntry(this.hass, values);
        this._bulkAddArea(area.area_id);
        return area;
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
    this._subEntries = await getSubEntries(this.hass.callWS, entryId);
  }

  private _addDevice() {
    const { filteredConfigEntry, filteredDomains } =
      this._filteredEntitiesAndDomains(
        this.hass.localize,
        this._entities!,
        this.hass.devices,
        this.hass.areas,
        this._entitiesWithoutUniqueId,
        this._filters,
        this._filteredItems,
        this._exposedEntities,
        this._entries,
        this._labels
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

    const integrations = this._filters["ha-filter-integrations"];
    showAddIntegrationDialog(this, {
      domain:
        Array.isArray(integrations) && integrations.length === 1
          ? integrations[0]
          : undefined,
      navigateToResult: true,
    });
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._activeColumnOrder = ev.detail.columnOrder;
    this._activeHiddenColumns = ev.detail.hiddenColumns;
  }

  private _handleBulkAction(ev: HaDropdownSelectEvent) {
    const action = ev.detail.item.value;

    if (!action) {
      return;
    }

    switch (action) {
      case "enable_selected":
        this._enableSelected();
        return;
      case "disable_selected":
        this._disableSelected();
        return;
      case "unhide_selected":
        this._unhideSelected();
        return;
      case "hide_selected":
        this._hideSelected();
        return;
      case "restore_entity_id_selected":
        this._restoreEntityIdSelected();
        return;
      case "delete_selected":
        this._removeSelected();
        return;
    }

    if (action.startsWith("label_")) {
      this._handleBulkLabel(ev);
      return;
    }

    if (action.startsWith("area_")) {
      this._handleBulkArea(ev);
      return;
    }

    if (action.startsWith("expose_") || action.startsWith("unexpose_")) {
      const assistant = action.substring(action.indexOf("_") + 1);
      this._exposeSelected(
        assistant === "all"
          ? this._exposableAssistants(this.cloudStatus, this.hass)
          : [assistant],
        action.startsWith("expose_")
      );
    }
  }

  // Alexa and Google Assistant can't be exposed to from the UI when they
  // are configured manually in YAML, same as on the voice assistants expose page
  private _exposableAssistants = memoize(
    (cloudStatus: CloudStatus | undefined, hass: HomeAssistant) =>
      getAvailableAssistants(cloudStatus, hass).filter(
        (assistant) =>
          !(
            cloudStatus?.logged_in &&
            ((assistant === "cloud.alexa" &&
              !isEmptyEntityDomainFilter(cloudStatus.alexa_entities)) ||
              (assistant === "cloud.google_assistant" &&
                !isEmptyEntityDomainFilter(cloudStatus.google_entities)))
          )
      )
  );

  private _renderVoiceAssistantItems(
    action: "expose" | "unexpose",
    assistants: string[]
  ) {
    return html`${assistants.map(
      (assistant) =>
        html`<ha-dropdown-item
          slot="submenu"
          .value=${`${action}_${assistant}`}
        >
          ${voiceAssistants[assistant].name}
        </ha-dropdown-item>`
    )}
    ${
      assistants.length > 1
        ? html`<ha-dropdown-item slot="submenu" .value=${`${action}_all`}>
            ${this.hass.localize(
              "ui.panel.config.entities.picker.expose_selected.all_assistants"
            )}
          </ha-dropdown-item>`
        : nothing
    }`;
  }

  private async _exposeSelected(assistants: string[], shouldExpose: boolean) {
    // Only entities with a state can be exposed, same as the expose page
    const entityIds = this._selected.filter(
      (entityId) => entityId in this.hass.states
    );

    if (!entityIds.length) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.entities.picker.expose_selected.no_entities"
        ),
      });
      return;
    }

    let changedEntities: { assistant: string; entityIds: string[] }[];
    try {
      changedEntities = await Promise.all(
        assistants.map(async (assistant) => ({
          assistant,
          entityIds: (
            await exposeEntities(
              this.hass,
              [assistant],
              entityIds,
              shouldExpose
            )
          ).changed_entity_ids,
        }))
      );
    } catch (err: any) {
      showAlertDialog(this, {
        text: err.message || err.code || String(err),
      });
      return;
    }
    fireEvent(this, "exposed-entities-changed");
    this._clearSelection();

    showToast(this, {
      id: EXPOSE_TOAST_ID,
      message: this.hass.localize(
        shouldExpose
          ? "ui.panel.config.entities.picker.expose_selected.toast"
          : "ui.panel.config.entities.picker.unexpose_selected.toast",
        {
          count: new Set(
            changedEntities.flatMap((changed) => changed.entityIds)
          ).size,
          assistants: assistants
            .map((assistant) => voiceAssistants[assistant].name)
            .join(", "),
        }
      ),
      duration: 8000,
      action: {
        text: this.hass.localize("ui.common.undo"),
        action: () => this._undoExpose(changedEntities, shouldExpose),
      },
    });
  }

  private async _undoExpose(
    changedEntities: { assistant: string; entityIds: string[] }[],
    shouldExpose: boolean
  ) {
    try {
      await Promise.all(
        changedEntities
          .filter(({ entityIds }) => entityIds.length)
          .map(({ assistant, entityIds }) =>
            exposeEntities(this.hass, [assistant], entityIds, !shouldExpose)
          )
      );
    } catch (err: any) {
      showAlertDialog(this, {
        text: err.message || err.code || String(err),
      });
    }
    fireEvent(this, "exposed-entities-changed");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
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
        ha-dropdown::part(menu) {
          --auto-size-available-width: calc(50vw - var(--ha-space-4));
        }
        ha-dropdown-item::part(submenu) {
          max-width: calc(60vw - var(--ha-space-8));
          max-height: calc(100vh - var(--ha-space-8));
          overflow-y: auto;
        }
        ha-dropdown ha-assist-chip {
          --ha-assist-chip-trailing-space: 8px;
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
