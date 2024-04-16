import { consume } from "@lit-labs/context";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
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
  mdiRestoreAlert,
  mdiToggleSwitch,
  mdiToggleSwitchOffOutline,
} from "@mdi/js";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoize from "memoize-one";
import { computeCssColor } from "../../../common/color/compute-color";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/data-table/ha-data-table-labels";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-check-list-item";
import "../../../components/ha-filter-devices";
import "../../../components/ha-filter-floor-areas";
import "../../../components/ha-filter-integrations";
import "../../../components/ha-filter-labels";
import "../../../components/ha-filter-states";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-menu-item";
import "../../../components/ha-sub-menu";
import "../../../components/ha-svg-icon";
import { ConfigEntry, getConfigEntries } from "../../../data/config_entries";
import { fullEntitiesContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity";
import {
  EntityRegistryEntry,
  UpdateEntityRegistryEntryResult,
  computeEntityRegistryName,
  removeEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import {
  LabelRegistryEntry,
  createLabelRegistryEntry,
  subscribeLabelRegistry,
} from "../../../data/label_registry";
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
import "../integrations/ha-integration-overflow-menu";
import { showAddIntegrationDialog } from "../integrations/show-add-integration-dialog";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";
import {
  EntitySources,
  fetchEntitySourcesWithCache,
} from "../../../data/entity_sources";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../../common/util/promise-all-settled-results";

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
  localized_platform: string;
  label_entries: LabelRegistryEntry[];
}

@customElement("ha-config-entities")
export class HaConfigEntities extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _stateEntities: StateEntity[] = [];

  @state() private _entries?: ConfigEntry[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entities!: EntityRegistryEntry[];

  @state() private _filter: string = history.state?.filter || "";

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _filters: Record<
    string,
    { value: string[] | undefined; items: Set<string> | undefined }
  > = {};

  @state() private _selected: string[] = [];

  @state() private _expandedFilter?: string;

  @state()
  _labels!: LabelRegistryEntry[];

  @state() private _entitySources?: EntitySources;

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("location-changed", this._locationChanged);
    window.addEventListener("popstate", this._popState);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._locationChanged);
    window.removeEventListener("popstate", this._popState);
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

  private _states = memoize((localize: LocalizeFunc) => [
    {
      value: "disabled",
      label: localize("ui.panel.config.entities.picker.status.disabled"),
    },
    {
      value: "hidden",
      label: localize("ui.panel.config.entities.picker.status.hidden"),
    },
    {
      value: "unavailable",
      label: localize("ui.panel.config.entities.picker.status.unavailable"),
    },
    {
      value: "readonly",
      label: localize("ui.panel.config.entities.picker.status.readonly"),
    },
  ]);

  private _columns = memoize(
    (
      localize: LocalizeFunc,
      narrow,
      _language
    ): DataTableColumnContainer<EntityRow> => ({
      icon: {
        title: "",
        label: localize("ui.panel.config.entities.picker.headers.state_icon"),
        type: "icon",
        template: (entry) =>
          entry.icon
            ? html`<ha-icon .icon=${entry.icon}></ha-icon>`
            : entry.entity
              ? html`
                  <ha-state-icon
                    title=${ifDefined(entry.entity?.state)}
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
        title: localize("ui.panel.config.entities.picker.headers.name"),
        sortable: true,
        filterable: true,
        direction: "asc",
        grows: true,
        template: (entry) => html`
          <div style="font-size: 14px;">${entry.name}</div>
          ${narrow
            ? html`<div class="secondary">
                ${entry.entity_id} | ${entry.localized_platform}
              </div>`
            : nothing}
          ${entry.label_entries.length
            ? html`
                <ha-data-table-labels
                  .labels=${entry.label_entries}
                ></ha-data-table-labels>
              `
            : nothing}
        `,
      },
      entity_id: {
        title: localize("ui.panel.config.entities.picker.headers.entity_id"),
        hidden: narrow,
        sortable: true,
        filterable: true,
        width: "25%",
      },
      localized_platform: {
        title: localize("ui.panel.config.entities.picker.headers.integration"),
        hidden: narrow,
        sortable: true,
        groupable: true,
        filterable: true,
        width: "20%",
      },
      area: {
        title: localize("ui.panel.config.entities.picker.headers.area"),
        sortable: true,
        hidden: narrow,
        filterable: true,
        groupable: true,
        width: "15%",
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
        sortable: true,
        filterable: true,
        groupable: true,
        width: "68px",
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
                  <simple-tooltip animation-delay="0" position="left">
                    ${entry.restored
                      ? this.hass.localize(
                          "ui.panel.config.entities.picker.status.restored"
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
                                "ui.panel.config.entities.picker.status.readonly"
                              )}
                  </simple-tooltip>
                </div>
              `
            : "—",
      },
      labels: {
        title: "",
        hidden: true,
        filterable: true,
        template: (entry) =>
          entry.label_entries.map((lbl) => lbl.name).join(" "),
      },
    })
  );

  private _filteredEntitiesAndDomains = memoize(
    (
      localize: LocalizeFunc,
      entities: StateEntity[],
      devices: HomeAssistant["devices"],
      areas: HomeAssistant["areas"],
      stateEntities: StateEntity[],
      filters: Record<
        string,
        { value: string[] | undefined; items: Set<string> | undefined }
      >,
      entries?: ConfigEntry[],
      labelReg?: LabelRegistryEntry[]
    ) => {
      const result: EntityRow[] = [];

      const stateFilters = filters["ha-filter-states"]?.value;

      const showReadOnly =
        !stateFilters?.length || stateFilters.includes("readonly");
      const showDisabled =
        !stateFilters?.length || stateFilters.includes("disabled");
      const showHidden =
        !stateFilters?.length || stateFilters.includes("hidden");
      const showUnavailable =
        !stateFilters?.length || stateFilters.includes("unavailable");

      let filteredEntities = showReadOnly
        ? entities.concat(stateEntities)
        : entities;

      let filteredConfigEntry: ConfigEntry | undefined;
      const filteredDomains = new Set<string>();

      Object.entries(filters).forEach(([key, filter]) => {
        if (key === "config_entry" && filter.value?.length) {
          filteredEntities = filteredEntities.filter(
            (entity) =>
              entity.config_entry_id &&
              filter.value?.includes(entity.config_entry_id)
          );

          if (!entries) {
            this._loadConfigEntries();
            return;
          }

          const configEntries = entries.filter(
            (entry) => entry.entry_id && filter.value?.includes(entry.entry_id)
          );

          configEntries.forEach((configEntry) => {
            filteredDomains.add(configEntry.domain);
          });
          if (configEntries.length === 1) {
            filteredConfigEntry = configEntries[0];
          }
        } else if (key === "ha-filter-integrations" && filter.value?.length) {
          if (!entries) {
            this._loadConfigEntries();
            return;
          }
          const entryIds = entries
            .filter((entry) => filter.value!.includes(entry.domain))
            .map((entry) => entry.entry_id);

          filteredEntities = filteredEntities.filter(
            (entity) =>
              filter.value?.includes(entity.platform) ||
              (entity.config_entry_id &&
                entryIds.includes(entity.config_entry_id))
          );
          filter.value!.forEach((domain) => filteredDomains.add(domain));
        } else if (key === "ha-filter-labels" && filter.value?.length) {
          filteredEntities = filteredEntities.filter((entity) =>
            entity.labels.some((lbl) => filter.value!.includes(lbl))
          );
        } else if (filter.items) {
          filteredEntities = filteredEntities.filter((entity) =>
            filter.items!.has(entity.entity_id)
          );
        }
      });

      if (!showDisabled) {
        filteredEntities = filteredEntities.filter(
          (entity) => !entity.disabled_by
        );
      }

      if (!showHidden) {
        filteredEntities = filteredEntities.filter(
          (entity) => !entity.hidden_by
        );
      }

      for (const entry of filteredEntities) {
        const entity = this.hass.states[entry.entity_id];
        const unavailable = entity?.state === UNAVAILABLE;
        const restored = entity?.attributes.restored === true;
        const areaId = entry.area_id ?? devices[entry.device_id!]?.area_id;
        const area = areaId ? areas[areaId] : undefined;

        if (!showUnavailable && unavailable) {
          continue;
        }

        const labels = labelReg && entry?.labels;
        const labelsEntries = (labels || []).map(
          (lbl) => labelReg!.find((label) => label.label_id === lbl)!
        );

        result.push({
          ...entry,
          entity,
          name: computeEntityRegistryName(
            this.hass!,
            entry as EntityRegistryEntry
          ),
          unavailable,
          restored,
          localized_platform:
            localize(`component.${entry.platform}.title`) || entry.platform,
          area: area ? area.name : "—",
          status: restored
            ? localize("ui.panel.config.entities.picker.status.restored")
            : unavailable
              ? localize("ui.panel.config.entities.picker.status.unavailable")
              : entry.disabled_by
                ? localize("ui.panel.config.entities.picker.status.disabled")
                : entry.hidden_by
                  ? localize("ui.panel.config.entities.picker.status.hidden")
                  : entry.readonly
                    ? localize(
                        "ui.panel.config.entities.picker.status.readonly"
                      )
                    : localize(
                        "ui.panel.config.entities.picker.status.available"
                      ),
          label_entries: labelsEntries,
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
        this._entries,
        this._labels
      );

    const includeAddDeviceFab =
      filteredDomains.size === 1 &&
      (PROTOCOL_INTEGRATIONS as ReadonlyArray<string>).includes(
        [...filteredDomains][0]
      );

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
        return html`<ha-menu-item
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
        </ha-menu-item>`;
      })}
      <md-divider role="separator" tabindex="-1"></md-divider>
      <ha-menu-item @click=${this._bulkCreateLabel}>
        <div slot="headline">
          ${this.hass.localize("ui.panel.config.labels.add_label")}
        </div></ha-menu-item
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
        .columns=${this._columns(
          this.hass.localize,
          this.narrow,
          this.hass.language
        )}
        .data=${filteredEntities}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.entities.picker.search",
          { number: filteredEntities.length }
        )}
        hasFilters
        .filters=${
          Object.values(this._filters).filter((filter) =>
            Array.isArray(filter.value)
              ? filter.value.length
              : filter.value &&
                Object.values(filter.value).some((val) =>
                  Array.isArray(val) ? val.length : val
                )
          ).length
        }
        .filter=${this._filter}
        selectable
        .selected=${this._selected.length}
        @selection-changed=${this._handleSelectionChanged}
        clickable
        @clear-filter=${this._clearFilter}
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
    ? html`<ha-button-menu-new slot="selection-bar">
        <ha-assist-chip
          slot="trigger"
          .label=${this.hass.localize(
            "ui.panel.config.automation.picker.bulk_actions.add_label"
          )}
        >
          <ha-svg-icon slot="trailing-icon" .path=${mdiMenuDown}></ha-svg-icon>
        </ha-assist-chip>
        ${labelItems}
      </ha-button-menu-new>`
    : nothing
}
<ha-button-menu-new has-overflow slot="selection-bar">
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
          .label=${"ui.panel.config.automation.picker.bulk_action"}
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
            <ha-menu-item slot="item">
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.automation.picker.bulk_actions.add_label"
                )}
              </div>
              <ha-svg-icon slot="end" .path=${mdiChevronRight}></ha-svg-icon>
            </ha-menu-item>
            <ha-menu slot="menu">${labelItems}</ha-menu>
          </ha-sub-menu>
          <md-divider role="separator" tabindex="-1"></md-divider>`
      : nothing
  }

  <ha-menu-item @click=${this._enableSelected}>
    <ha-svg-icon slot="start" .path=${mdiToggleSwitch}></ha-svg-icon>
    <div slot="headline">
      ${this.hass.localize(
        "ui.panel.config.entities.picker.enable_selected.button"
      )}
    </div>
  </ha-menu-item>
  <ha-menu-item @click=${this._disableSelected}>
    <ha-svg-icon
      slot="start"
      .path=${mdiToggleSwitchOffOutline}
    ></ha-svg-icon>
    <div slot="headline">
      ${this.hass.localize(
        "ui.panel.config.entities.picker.disable_selected.button"
      )}
    </div>
  </ha-menu-item>
  <md-divider role="separator" tabindex="-1"></md-divider>

  <ha-menu-item @click=${this._unhideSelected}>
    <ha-svg-icon
      slot="start"
      .path=${mdiEye}
    ></ha-svg-icon>
    <div slot="headline">
      ${this.hass.localize(
        "ui.panel.config.entities.picker.unhide_selected.button"
      )}
    </div>
  </ha-menu-item>
  <ha-menu-item @click=${this._hideSelected}>
    <ha-svg-icon
      slot="start"
      .path=${mdiEyeOff}
    ></ha-svg-icon>
    <div slot="headline">
      ${this.hass.localize(
        "ui.panel.config.entities.picker.hide_selected.button"
      )}
    </div>
  </ha-menu-item>
  <md-divider role="separator" tabindex="-1"></md-divider>

  <ha-menu-item @click=${this._removeSelected} class="warning">
    <ha-svg-icon
      slot="start"
      .path=${mdiDelete}
    ></ha-svg-icon>
    <div slot="headline">
      ${this.hass.localize(
        "ui.panel.config.entities.picker.remove_selected.button"
      )}
    </div>
  </ha-menu-item>

</ha-button-menu-new>
        ${
          this._filters.config_entry?.value?.length
            ? html`<ha-alert slot="filter-pane">
                Filtering by config entry
                ${this._entries?.find(
                  (entry) =>
                    entry.entry_id === this._filters.config_entry!.value![0]
                )?.title || this._filters.config_entry.value[0]}
              </ha-alert>`
            : nothing
        }
        <ha-filter-floor-areas
          .hass=${this.hass}
          type="entity"
          .value=${this._filters["ha-filter-floor-areas"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-floor-areas"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-floor-areas>
        <ha-filter-devices
          .hass=${this.hass}
          .type=${"entity"}
          .value=${this._filters["ha-filter-devices"]?.value}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-devices"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-devices>
        <ha-filter-integrations
          .hass=${this.hass}
          .value=${this._filters["ha-filter-integrations"]?.value}
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
          .value=${this._filters["ha-filter-states"]?.value}
          .states=${this._states(this.hass.localize)}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          .expanded=${this._expandedFilter === "ha-filter-states"}
          .narrow=${this.narrow}
          @expanded-changed=${this._filterExpanded}
        ></ha-filter-states>
        <ha-filter-labels
          .hass=${this.hass}
          .value=${this._filters["ha-filter-labels"]?.value}
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
    this._filters = { ...this._filters, [type]: ev.detail };
  }

  protected firstUpdated() {
    this._filters = {
      "ha-filter-states": {
        value: ["unavailable", "readonly"],
        items: undefined,
      },
    };
    this._setFiltersFromUrl();
    fetchEntitySourcesWithCache(this.hass).then((sources) => {
      this._entitySources = sources;
    });
  }

  private _setFiltersFromUrl() {
    if (this._searchParms.has("domain")) {
      this._filters = {
        ...this._filters,
        "ha-filter-states": {
          value: [
            ...(this._filters["ha-filter-states"]?.value || []),
            "disabled",
          ],
          items: undefined,
        },
        "ha-filter-integrations": {
          value: [this._searchParms.get("domain")!],
          items: undefined,
        },
      };
    }
    if (this._searchParms.has("config_entry")) {
      this._filters = {
        ...this._filters,
        "ha-filter-states": {
          value: [
            ...(this._filters["ha-filter-states"]?.value || []),
            "disabled",
          ],
          items: undefined,
        },
        config_entry: {
          value: [this._searchParms.get("config_entry")!],
          items: undefined,
        },
      };
    }
    if (this._searchParms.has("label")) {
      this._filterLabel();
    }
  }

  private _filterLabel() {
    const label = this._searchParms.get("label");
    if (!label) {
      return;
    }
    this._filters = {
      ...this._filters,
      "ha-filter-labels": {
        value: [label],
        items: undefined,
      },
    };
  }

  private _clearFilter() {
    this._filters = {};
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    const oldHass = changedProps.get("hass");
    let changed = false;
    if (!this.hass || !this._entities) {
      return;
    }
    if (
      changedProps.has("hass") ||
      changedProps.has("_entities") ||
      changedProps.has("_entitySources")
    ) {
      const stateEntities: StateEntity[] = [];
      const regEntityIds = new Set(
        this._entities.map((entity) => entity.entity_id)
      );
      for (const entityId of Object.keys(this.hass.states)) {
        if (regEntityIds.has(entityId)) {
          continue;
        }
        if (
          !oldHass ||
          changedProps.has("_entitySources") ||
          this.hass.states[entityId] !== oldHass.states[entityId]
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
          device_id: null,
          icon: null,
          readonly: true,
          selectable: false,
          entity_category: null,
          has_entity_name: false,
          options: null,
          labels: [],
          categories: {},
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

  private async _enableSelected() {
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
  }

  private _disableSelected() {
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
  }

  private _hideSelected() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.entities.picker.hide_selected.confirm_title",
        { number: this._selected.length }
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.hide_selected.confirm_text"
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
  }

  private _unhideSelected() {
    this._selected.forEach((entity) =>
      updateEntityRegistryEntry(this.hass, entity, {
        hidden_by: null,
      })
    );
    this._clearSelection();
  }

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

  private _bulkCreateLabel() {
    showLabelDetailDialog(this, {
      createEntry: async (values) => {
        const label = await createLabelRegistryEntry(this.hass, values);
        this._bulkLabel(label.label_id, "add");
        return label;
      },
    });
  }

  private _removeSelected() {
    const removeableEntities = this._selected.filter((entity) => {
      const stateObj = this.hass.states[entity];
      return stateObj?.attributes.restored;
    });
    showConfirmationDialog(this, {
      title: this.hass.localize(
        `ui.panel.config.entities.picker.remove_selected.confirm_${
          removeableEntities.length !== this._selected.length ? "partly_" : ""
        }title`,
        { number: removeableEntities.length }
      ),
      text:
        removeableEntities.length === this._selected.length
          ? this.hass.localize(
              "ui.panel.config.entities.picker.remove_selected.confirm_text"
            )
          : this.hass.localize(
              "ui.panel.config.entities.picker.remove_selected.confirm_partly_text",
              {
                removable: removeableEntities.length,
                selected: this._selected.length,
              }
            ),
      confirmText: this.hass.localize("ui.common.remove"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: () => {
        removeableEntities.forEach((entity) =>
          removeEntityRegistryEntry(this.hass, entity)
        );
        this._clearSelection();
      },
    });
  }

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

  private _addDevice() {
    const { filteredConfigEntry, filteredDomains } =
      this._filteredEntitiesAndDomains(
        this.hass.localize,
        this._entities!,
        this.hass.devices,
        this.hass.areas,
        this._stateEntities,
        this._filters,
        this._entries,
        this._labels
      );
    if (
      filteredDomains.size === 1 &&
      (PROTOCOL_INTEGRATIONS as ReadonlyArray<string>).includes(
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
          font-weight: bold;
          padding-left: 16px;
          padding-inline-start: 16px;
          padding-inline-end: initial;
          direction: var(--direction);
        }
        .table-header .selected-txt {
          margin-top: 20px;
        }
        .header-toolbar .selected-txt {
          font-size: 16px;
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
        .header-btns > mwc-button,
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
        ha-button-menu-new ha-assist-chip {
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
