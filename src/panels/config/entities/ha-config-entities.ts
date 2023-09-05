import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import {
  mdiAlertCircle,
  mdiCancel,
  mdiDelete,
  mdiEyeOff,
  mdiFilterVariant,
  mdiPencilOff,
  mdiPlus,
  mdiRestoreAlert,
  mdiUndo,
} from "@mdi/js";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import memoize from "memoize-one";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import { LocalizeFunc } from "../../../common/translations/localize";
import { computeRTL } from "../../../common/util/compute_rtl";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button-menu";
import "../../../components/ha-check-list-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../../data/area_registry";
import { ConfigEntry, getConfigEntries } from "../../../data/config_entries";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../data/device_registry";
import { UNAVAILABLE } from "../../../data/entity";
import {
  computeEntityRegistryName,
  EntityRegistryEntry,
  removeEntityRegistryEntry,
  subscribeEntityRegistry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { domainToName } from "../../../data/integration";
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
import {
  protocolIntegrationPicked,
  PROTOCOL_INTEGRATIONS,
} from "../../../common/integrations/protocolIntegrationPicked";
import { showAddIntegrationDialog } from "../integrations/show-add-integration-dialog";

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
  status: string;
  area?: string;
}

@customElement("ha-config-entities")
export class HaConfigEntities extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _areas: AreaRegistryEntry[] = [];

  @state() private _stateEntities: StateEntity[] = [];

  @property() public _entries?: ConfigEntry[];

  @state() private _showDisabled = false;

  @state() private _showHidden = false;

  @state() private _showUnavailable = true;

  @state() private _showReadOnly = true;

  @state() private _filter: string = history.state?.filter || "";

  @state() private _numHiddenEntities = 0;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _selectedEntities: string[] = [];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  private _activeFilters = memoize(
    (
      filters: URLSearchParams,
      localize: LocalizeFunc,
      entries?: ConfigEntry[]
    ): string[] | undefined => {
      const filterTexts: string[] = [];
      filters.forEach((value, key) => {
        switch (key) {
          case "config_entry": {
            // If we are requested to show the entities for a given config entry,
            // also show the disabled ones by default.
            this._showDisabled = true;

            if (!entries) {
              this._loadConfigEntries();
              break;
            }
            const configEntry = entries.find(
              (entry) => entry.entry_id === value
            );
            if (!configEntry) {
              break;
            }
            const integrationName = domainToName(localize, configEntry.domain);
            filterTexts.push(
              `${this.hass.localize(
                "ui.panel.config.integrations.integration"
              )} "${integrationName}${
                integrationName !== configEntry.title
                  ? `: ${configEntry.title}`
                  : ""
              }"`
            );
            break;
          }
          case "domain": {
            this._showDisabled = true;
            filterTexts.push(
              `${this.hass.localize(
                "ui.panel.config.integrations.integration"
              )} "${domainToName(localize, value)}"`
            );
          }
        }
      });
      return filterTexts.length ? filterTexts : undefined;
    }
  );

  private _columns = memoize(
    (narrow, _language, showDisabled): DataTableColumnContainer<EntityRow> => ({
      icon: {
        title: "",
        label: this.hass.localize(
          "ui.panel.config.entities.picker.headers.state_icon"
        ),
        type: "icon",
        template: (entry) => html`
          <ha-state-icon
            title=${ifDefined(entry.entity?.state)}
            slot="item-icon"
            .state=${entry.entity}
          ></ha-state-icon>
        `,
      },
      name: {
        main: true,
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.name"
        ),
        sortable: true,
        filterable: true,
        direction: "asc",
        grows: true,
        template: narrow
          ? (entry) => html`
              ${entry.name}<br />
              <div class="secondary">
                ${entry.entity_id} |
                ${this.hass.localize(`component.${entry.platform}.title`) ||
                entry.platform}
              </div>
            `
          : undefined,
      },
      entity_id: {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.entity_id"
        ),
        hidden: narrow,
        sortable: true,
        filterable: true,
        width: "25%",
      },
      platform: {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.integration"
        ),
        hidden: narrow,
        sortable: true,
        filterable: true,
        width: "20%",
        template: (entry) =>
          this.hass.localize(`component.${entry.platform}.title`) ||
          entry.platform,
      },
      area: {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.area"
        ),
        sortable: true,
        hidden: narrow,
        filterable: true,
        width: "15%",
      },
      disabled_by: {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.disabled_by"
        ),
        sortable: true,
        hidden: narrow || !showDisabled,
        filterable: true,
        width: "15%",
        template: (entry) =>
          entry.disabled_by === null
            ? "—"
            : this.hass.localize(
                `config_entry.disabled_by.${entry.disabled_by}`
              ),
      },
      status: {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.status"
        ),
        type: "icon",
        sortable: true,
        filterable: true,
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
    })
  );

  private _filteredEntitiesAndDomains = memoize(
    (
      entities: StateEntity[],
      devices: DeviceRegistryEntry[] | undefined,
      areas: AreaRegistryEntry[] | undefined,
      stateEntities: StateEntity[],
      filters: URLSearchParams,
      showDisabled: boolean,
      showUnavailable: boolean,
      showReadOnly: boolean,
      showHidden: boolean,
      entries?: ConfigEntry[]
    ) => {
      const result: EntityRow[] = [];

      // If nothing gets filtered, this is our correct count of entities
      let startLength = entities.length + stateEntities.length;

      const areaLookup: { [areaId: string]: AreaRegistryEntry } = {};
      const deviceLookup: { [deviceId: string]: DeviceRegistryEntry } = {};

      if (areas) {
        for (const area of areas) {
          areaLookup[area.area_id] = area;
        }
        if (devices) {
          for (const device of devices) {
            deviceLookup[device.id] = device;
          }
        }
      }

      let filteredEntities = showReadOnly
        ? entities.concat(stateEntities)
        : entities;

      let filteredConfigEntry: ConfigEntry | undefined;
      const filteredDomains = new Set<string>();

      filters.forEach((value, key) => {
        if (key === "config_entry") {
          filteredEntities = filteredEntities.filter(
            (entity) => entity.config_entry_id === value
          );
          // If we have an active filter and `showReadOnly` is true, the length of `entities` is correct.
          // If however, the read-only entities were not added before, we need to check how many would
          // have matched the active filter and add that number to the count.
          startLength = filteredEntities.length;
          if (!showReadOnly) {
            startLength += stateEntities.filter(
              (entity) => entity.config_entry_id === value
            ).length;
          }

          if (!entries) {
            this._loadConfigEntries();
            return;
          }

          const configEntry = entries.find((entry) => entry.entry_id === value);

          if (configEntry) {
            filteredDomains.add(configEntry.domain);
            filteredConfigEntry = configEntry;
          }
        }
        if (key === "domain") {
          if (!entries) {
            this._loadConfigEntries();
            return;
          }
          const entryIds = entries
            .filter((entry) => entry.domain === value)
            .map((entry) => entry.entry_id);
          filteredEntities = filteredEntities.filter(
            (entity) =>
              entity.config_entry_id &&
              entryIds.includes(entity.config_entry_id)
          );
          filteredDomains.add(value);
          startLength = filteredEntities.length;
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
        const areaId = entry.area_id ?? deviceLookup[entry.device_id!]?.area_id;
        const area = areaId ? areaLookup[areaId] : undefined;

        if (!showUnavailable && unavailable) {
          continue;
        }

        result.push({
          ...entry,
          entity,
          name: computeEntityRegistryName(
            this.hass!,
            entry as EntityRegistryEntry
          ),
          unavailable,
          restored,
          area: area ? area.name : "—",
          status: restored
            ? this.hass.localize(
                "ui.panel.config.entities.picker.status.restored"
              )
            : unavailable
            ? this.hass.localize(
                "ui.panel.config.entities.picker.status.unavailable"
              )
            : entry.disabled_by
            ? this.hass.localize(
                "ui.panel.config.entities.picker.status.disabled"
              )
            : this.hass.localize("ui.panel.config.entities.picker.status.ok"),
        });
      }

      this._numHiddenEntities = startLength - result.length;
      return { filteredEntities: result, filteredConfigEntry, filteredDomains };
    }
  );

  public constructor() {
    super();
    window.addEventListener("location-changed", () => {
      if (
        window.location.search.substring(1) !== this._searchParms.toString()
      ) {
        this._searchParms = new URLSearchParams(window.location.search);
      }
    });
    window.addEventListener("popstate", () => {
      if (
        window.location.search.substring(1) !== this._searchParms.toString()
      ) {
        this._searchParms = new URLSearchParams(window.location.search);
      }
    });
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities;
      }),
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._devices = devices;
      }),
      subscribeAreaRegistry(this.hass.connection, (areas) => {
        this._areas = areas;
      }),
    ];
  }

  protected render() {
    if (!this.hass || this._entities === undefined) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }
    const activeFilters = this._activeFilters(
      this._searchParms,
      this.hass.localize,
      this._entries
    );

    const { filteredEntities, filteredDomains } =
      this._filteredEntitiesAndDomains(
        this._entities,
        this._devices,
        this._areas,
        this._stateEntities,
        this._searchParms,
        this._showDisabled,
        this._showUnavailable,
        this._showReadOnly,
        this._showHidden,
        this._entries
      );

    const includeAddDeviceFab =
      filteredDomains.size === 1 &&
      (PROTOCOL_INTEGRATIONS as ReadonlyArray<string>).includes(
        [...filteredDomains][0]
      );

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config"}
        .route=${this.route}
        .tabs=${configSections.devices}
        .columns=${this._columns(
          this.narrow,
          this.hass.language,
          this._showDisabled
        )}
        .data=${filteredEntities}
        .activeFilters=${activeFilters}
        .numHidden=${this._numHiddenEntities}
        .hideFilterMenu=${this._selectedEntities.length > 0}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.entities.picker.search"
        )}
        .hiddenLabel=${this.hass.localize(
          "ui.panel.config.entities.picker.filter.hidden_entities",
          "number",
          this._numHiddenEntities
        )}
        .filter=${this._filter}
        selectable
        clickable
        @selection-changed=${this._handleSelectionChanged}
        @clear-filter=${this._clearFilter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._openEditEntry}
        id="entity_id"
        .hasFab=${includeAddDeviceFab}
      >
        <ha-integration-overflow-menu
          .hass=${this.hass}
          slot="toolbar-icon"
        ></ha-integration-overflow-menu>
        ${this._selectedEntities.length
          ? html`
              <div
                class=${classMap({
                  "header-toolbar": this.narrow,
                  "table-header": !this.narrow,
                })}
                slot="header"
              >
                <p class="selected-txt">
                  ${this.hass.localize(
                    "ui.panel.config.entities.picker.selected",
                    "number",
                    this._selectedEntities.length
                  )}
                </p>
                <div class="header-btns">
                  ${!this.narrow
                    ? html`
                        <mwc-button @click=${this._enableSelected}
                          >${this.hass.localize(
                            "ui.panel.config.entities.picker.enable_selected.button"
                          )}</mwc-button
                        >
                        <mwc-button @click=${this._disableSelected}
                          >${this.hass.localize(
                            "ui.panel.config.entities.picker.disable_selected.button"
                          )}</mwc-button
                        >
                        <mwc-button @click=${this._hideSelected}
                          >${this.hass.localize(
                            "ui.panel.config.entities.picker.hide_selected.button"
                          )}</mwc-button
                        >
                        <mwc-button
                          @click=${this._removeSelected}
                          class="warning"
                          >${this.hass.localize(
                            "ui.panel.config.entities.picker.remove_selected.button"
                          )}</mwc-button
                        >
                      `
                    : html`
                        <ha-icon-button
                          id="enable-btn"
                          @click=${this._enableSelected}
                          .path=${mdiUndo}
                          .label=${this.hass.localize("ui.common.enable")}
                        ></ha-icon-button>
                        <simple-tooltip animation-delay="0" for="enable-btn">
                          ${this.hass.localize(
                            "ui.panel.config.entities.picker.enable_selected.button"
                          )}
                        </simple-tooltip>
                        <ha-icon-button
                          id="disable-btn"
                          @click=${this._disableSelected}
                          .path=${mdiCancel}
                          .label=${this.hass.localize("ui.common.disable")}
                        ></ha-icon-button>
                        <simple-tooltip animation-delay="0" for="disable-btn">
                          ${this.hass.localize(
                            "ui.panel.config.entities.picker.disable_selected.button"
                          )}
                        </simple-tooltip>
                        <ha-icon-button
                          id="hide-btn"
                          @click=${this._hideSelected}
                          .path=${mdiEyeOff}
                          .label=${this.hass.localize("ui.common.hide")}
                        ></ha-icon-button>
                        <simple-tooltip animation-delay="0" for="hide-btn">
                          ${this.hass.localize(
                            "ui.panel.config.entities.picker.hide_selected.button"
                          )}
                        </simple-tooltip>
                        <ha-icon-button
                          class="warning"
                          id="remove-btn"
                          @click=${this._removeSelected}
                          .path=${mdiDelete}
                          .label=${this.hass.localize("ui.common.remove")}
                        ></ha-icon-button>
                        <simple-tooltip animation-delay="0" for="remove-btn">
                          ${this.hass.localize(
                            "ui.panel.config.entities.picker.remove_selected.button"
                          )}
                        </simple-tooltip>
                      `}
                </div>
              </div>
            `
          : html`
              <ha-button-menu slot="filter-menu" multi>
                <ha-icon-button
                  slot="trigger"
                  .label=${this.hass!.localize(
                    "ui.panel.config.entities.picker.filter.filter"
                  )}
                  .path=${mdiFilterVariant}
                ></ha-icon-button>
                ${this.narrow && activeFilters?.length
                  ? html`<mwc-list-item @click=${this._clearFilter}
                      >${this.hass.localize(
                        "ui.components.data-table.filtering_by"
                      )}
                      ${activeFilters.join(", ")}
                      <span class="clear">Clear</span></mwc-list-item
                    >`
                  : ""}
                <ha-check-list-item
                  @request-selected=${this._showDisabledChanged}
                  .selected=${this._showDisabled}
                  left
                >
                  ${this.hass!.localize(
                    "ui.panel.config.entities.picker.filter.show_disabled"
                  )}
                </ha-check-list-item>
                <ha-check-list-item
                  @request-selected=${this._showHiddenChanged}
                  .selected=${this._showHidden}
                  left
                >
                  ${this.hass!.localize(
                    "ui.panel.config.entities.picker.filter.show_hidden"
                  )}
                </ha-check-list-item>
                <ha-check-list-item
                  @request-selected=${this._showRestoredChanged}
                  graphic="control"
                  .selected=${this._showUnavailable}
                  left
                >
                  ${this.hass!.localize(
                    "ui.panel.config.entities.picker.filter.show_unavailable"
                  )}
                </ha-check-list-item>
                <ha-check-list-item
                  @request-selected=${this._showReadOnlyChanged}
                  graphic="control"
                  .selected=${this._showReadOnly}
                  left
                >
                  ${this.hass!.localize(
                    "ui.panel.config.entities.picker.filter.show_readonly"
                  )}
                </ha-check-list-item>
              </ha-button-menu>
            `}
        ${includeAddDeviceFab
          ? html`<ha-fab
              .label=${this.hass.localize("ui.panel.config.devices.add_device")}
              extended
              @click=${this._addDevice}
              slot="fab"
              ?rtl=${computeRTL(this.hass)}
            >
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </ha-fab>`
          : nothing}
      </hass-tabs-subpage-data-table>
    `;
  }

  public willUpdate(changedProps): void {
    super.willUpdate(changedProps);
    const oldHass = changedProps.get("hass");
    let changed = false;
    if (!this.hass || !this._entities) {
      return;
    }
    if (changedProps.has("hass") || changedProps.has("_entities")) {
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
          this.hass.states[entityId] !== oldHass.states[entityId]
        ) {
          changed = true;
        }
        stateEntities.push({
          name: computeStateName(this.hass.states[entityId]),
          entity_id: entityId,
          platform: computeDomain(entityId),
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
        });
      }
      if (changed) {
        this._stateEntities = stateEntities;
      }
    }
  }

  private _showDisabledChanged(ev: CustomEvent<RequestSelectedDetail>) {
    if (ev.detail.source !== "property") {
      return;
    }
    this._showDisabled = ev.detail.selected;
  }

  private _showHiddenChanged(ev: CustomEvent<RequestSelectedDetail>) {
    if (ev.detail.source !== "property") {
      return;
    }
    this._showHidden = ev.detail.selected;
  }

  private _showRestoredChanged(ev: CustomEvent<RequestSelectedDetail>) {
    if (ev.detail.source !== "property") {
      return;
    }
    this._showUnavailable = ev.detail.selected;
  }

  private _showReadOnlyChanged(ev: CustomEvent<RequestSelectedDetail>) {
    if (ev.detail.source !== "property") {
      return;
    }
    this._showReadOnly = ev.detail.selected;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
    history.replaceState({ filter: this._filter }, "");
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selectedEntities = ev.detail.value;
  }

  private async _enableSelected() {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.entities.picker.enable_selected.confirm_title",
        "number",
        this._selectedEntities.length
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.enable_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.enable"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: async () => {
        let require_restart = false;
        let reload_delay = 0;
        await Promise.all(
          this._selectedEntities.map(async (entity) => {
            const result = await updateEntityRegistryEntry(this.hass, entity, {
              disabled_by: null,
            });
            if (result.require_restart) {
              require_restart = true;
            }
            if (result.reload_delay) {
              reload_delay = Math.max(reload_delay, result.reload_delay);
            }
          })
        );
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
              "delay",
              reload_delay
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
        "number",
        this._selectedEntities.length
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.disable_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.disable"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: () => {
        this._selectedEntities.forEach((entity) =>
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
        "number",
        this._selectedEntities.length
      ),
      text: this.hass.localize(
        "ui.panel.config.entities.picker.hide_selected.confirm_text"
      ),
      confirmText: this.hass.localize("ui.common.hide"),
      dismissText: this.hass.localize("ui.common.cancel"),
      confirm: () => {
        this._selectedEntities.forEach((entity) =>
          updateEntityRegistryEntry(this.hass, entity, {
            hidden_by: "user",
          })
        );
        this._clearSelection();
      },
    });
  }

  private _removeSelected() {
    const removeableEntities = this._selectedEntities.filter((entity) => {
      const stateObj = this.hass.states[entity];
      return stateObj?.attributes.restored;
    });
    showConfirmationDialog(this, {
      title: this.hass.localize(
        `ui.panel.config.entities.picker.remove_selected.confirm_${
          removeableEntities.length !== this._selectedEntities.length
            ? "partly_"
            : ""
        }title`,
        "number",
        removeableEntities.length
      ),
      text:
        removeableEntities.length === this._selectedEntities.length
          ? this.hass.localize(
              "ui.panel.config.entities.picker.remove_selected.confirm_text"
            )
          : this.hass.localize(
              "ui.panel.config.entities.picker.remove_selected.confirm_partly_text",
              "removable",
              removeableEntities.length,
              "selected",
              this._selectedEntities.length
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

  private _clearFilter() {
    if (
      this._activeFilters(this._searchParms, this.hass.localize, this._entries)
    ) {
      navigate(window.location.pathname, { replace: true });
    }
    this._showDisabled = true;
    this._showReadOnly = true;
    this._showUnavailable = true;
    this._showHidden = true;
  }

  private _addDevice() {
    const { filteredConfigEntry, filteredDomains } =
      this._filteredEntitiesAndDomains(
        this._entities!,
        this._devices,
        this._areas,
        this._stateEntities,
        this._searchParms,
        this._showDisabled,
        this._showUnavailable,
        this._showReadOnly,
        this._showHidden,
        this._entries
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
        }
        .clear {
          color: var(--primary-color);
          padding-left: 8px;
          padding-inline-start: 8px;
          text-transform: uppercase;
          direction: var(--direction);
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
