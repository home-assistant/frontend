import "@material/mwc-list/mwc-list-item";
import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import {
  mdiCancel,
  mdiDelete,
  mdiFilterVariant,
  mdiPlus,
  mdiUndo,
} from "@mdi/js";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-tooltip/paper-tooltip";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoize from "memoize-one";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { domainIcon } from "../../../common/entity/domain_icon";
import { stateIcon } from "../../../common/entity/state_icon";
import { navigate } from "../../../common/navigate";
import "../../../common/search/search-input";
import { LocalizeFunc } from "../../../common/translations/localize";
import { computeRTL } from "../../../common/util/compute_rtl";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button-menu";
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
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { DialogEntityEditor } from "./dialog-entity-editor";
import {
  loadEntityEditorDialog,
  showEntityEditorDialog,
} from "./show-dialog-entity-editor";

export interface StateEntity extends EntityRegistryEntry {
  readonly?: boolean;
  selectable?: boolean;
}

export interface EntityRow extends StateEntity {
  icon: string;
  unavailable: boolean;
  restored: boolean;
  status: string;
  area?: string;
}

@customElement("ha-config-entities")
export class HaConfigEntities extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _areas: AreaRegistryEntry[] = [];

  @state() private _stateEntities: StateEntity[] = [];

  @property() public _entries?: ConfigEntry[];

  @state() private _showDisabled = false;

  @state() private _showUnavailable = true;

  @state() private _showReadOnly = true;

  @state() private _filter = "";

  @state() private _numHiddenEntities = 0;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _selectedEntities: string[] = [];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  private getDialog?: () => DialogEntityEditor | undefined;

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
        }
      });
      return filterTexts.length ? filterTexts : undefined;
    }
  );

  private _columns = memoize(
    (narrow, _language, showDisabled): DataTableColumnContainer => ({
      icon: {
        title: "",
        type: "icon",
        template: (icon) => html`
          <ha-icon slot="item-icon" .icon=${icon}></ha-icon>
        `,
      },
      name: {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.name"
        ),
        sortable: true,
        filterable: true,
        direction: "asc",
        grows: true,
        template: narrow
          ? (name, entity: any) =>
              html`
                ${name}<br />
                <div class="secondary">
                  ${entity.entity_id} |
                  ${this.hass.localize(`component.${entity.platform}.title`) ||
                  entity.platform}
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
        template: (platform) =>
          this.hass.localize(`component.${platform}.title`) || platform,
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
        template: (disabled_by) =>
          this.hass.localize(
            `ui.panel.config.devices.disabled_by.${disabled_by}`
          ) || disabled_by,
      },
      status: {
        title: this.hass.localize(
          "ui.panel.config.entities.picker.headers.status"
        ),
        type: "icon",
        sortable: true,
        filterable: true,
        width: "68px",
        template: (_status, entity: any) =>
          entity.unavailable || entity.disabled_by || entity.readonly
            ? html`
                <div
                  tabindex="0"
                  style="display:inline-block; position: relative;"
                >
                  <ha-icon
                    style=${styleMap({
                      color: entity.unavailable ? "var(--error-color)" : "",
                    })}
                    .icon=${entity.restored
                      ? "hass:restore-alert"
                      : entity.unavailable
                      ? "hass:alert-circle"
                      : entity.disabled_by
                      ? "hass:cancel"
                      : "hass:pencil-off"}
                  ></ha-icon>
                  <paper-tooltip animation-delay="0" position="left">
                    ${entity.restored
                      ? this.hass.localize(
                          "ui.panel.config.entities.picker.status.restored"
                        )
                      : entity.unavailable
                      ? this.hass.localize(
                          "ui.panel.config.entities.picker.status.unavailable"
                        )
                      : entity.disabled_by
                      ? this.hass.localize(
                          "ui.panel.config.entities.picker.status.disabled"
                        )
                      : this.hass.localize(
                          "ui.panel.config.entities.picker.status.readonly"
                        )}
                  </paper-tooltip>
                </div>
              `
            : "",
      },
    })
  );

  private _filteredEntitiesAndDomains = memoize(
    (
      entities: EntityRegistryEntry[],
      devices: DeviceRegistryEntry[] | undefined,
      areas: AreaRegistryEntry[] | undefined,
      stateEntities: StateEntity[],
      filters: URLSearchParams,
      showDisabled: boolean,
      showUnavailable: boolean,
      showReadOnly: boolean,
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

      entities.forEach((entity) => entity);

      let filteredEntities = showReadOnly
        ? entities.concat(stateEntities)
        : entities;

      const filteredDomains: string[] = [];

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
            filteredDomains.push(configEntry.domain);
          }
        }
      });

      if (!showDisabled) {
        filteredEntities = filteredEntities.filter(
          (entity) => !entity.disabled_by
        );
      }

      for (const entry of filteredEntities) {
        const entity = this.hass.states[entry.entity_id];
        const unavailable = entity?.state === UNAVAILABLE;
        const restored = entity?.attributes.restored;
        const areaId = entry.area_id ?? deviceLookup[entry.device_id!]?.area_id;
        const area = areaId ? areaLookup[areaId] : undefined;

        if (!showUnavailable && unavailable) {
          continue;
        }

        result.push({
          ...entry,
          icon: entity
            ? stateIcon(entity)
            : domainIcon(computeDomain(entry.entity_id)),
          name:
            computeEntityRegistryName(this.hass!, entry) ||
            this.hass.localize("state.default.unavailable"),
          unavailable,
          restored,
          area: area ? area.name : undefined,
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
      return { filteredEntities: result, filteredDomains: filteredDomains };
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

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (!this.getDialog) {
      return;
    }
    const dialog = this.getDialog();
    if (!dialog) {
      return;
    }
    dialog.closeDialog();
  }

  protected render(): TemplateResult {
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
        this._entries
      );

    const includeZHAFab = filteredDomains.includes("zha");

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config"}
        .route=${this.route}
        .tabs=${configSections.integrations}
        .columns=${this._columns(
          this.narrow,
          this.hass.language,
          this._showDisabled
        )}
        .data=${filteredEntities}
        .activeFilters=${activeFilters}
        .numHidden=${this._numHiddenEntities}
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
        .hasFab=${includeZHAFab}
      >
        ${this._selectedEntities.length
          ? html`<div
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
                      <mwc-button @click=${this._removeSelected} class="warning"
                        >${this.hass.localize(
                          "ui.panel.config.entities.picker.remove_selected.button"
                        )}</mwc-button
                      >
                    `
                  : html`
                      <mwc-icon-button
                        id="enable-btn"
                        @click=${this._enableSelected}
                        ><ha-svg-icon .path=${mdiUndo}></ha-svg-icon
                      ></mwc-icon-button>
                      <paper-tooltip animation-delay="0" for="enable-btn">
                        ${this.hass.localize(
                          "ui.panel.config.entities.picker.enable_selected.button"
                        )}
                      </paper-tooltip>
                      <mwc-icon-button
                        id="disable-btn"
                        @click=${this._disableSelected}
                        ><ha-svg-icon .path=${mdiCancel}></ha-svg-icon
                      ></mwc-icon-button>
                      <paper-tooltip animation-delay="0" for="disable-btn">
                        ${this.hass.localize(
                          "ui.panel.config.entities.picker.disable_selected.button"
                        )}
                      </paper-tooltip>
                      <mwc-icon-button
                        class="warning"
                        id="remove-btn"
                        @click=${this._removeSelected}
                        ><ha-svg-icon .path=${mdiDelete}></ha-svg-icon
                      ></mwc-icon-button>
                      <paper-tooltip animation-delay="0" for="remove-btn">
                        ${this.hass.localize(
                          "ui.panel.config.entities.picker.remove_selected.button"
                        )}
                      </paper-tooltip>
                    `}
              </div>
            </div> `
          : html`<ha-button-menu slot="filter-menu" corner="BOTTOM_START" multi>
              <mwc-icon-button
                slot="trigger"
                .label=${this.hass!.localize(
                  "ui.panel.config.entities.picker.filter.filter"
                )}
                .title=${this.hass!.localize(
                  "ui.panel.config.entities.picker.filter.filter"
                )}
              >
                <ha-svg-icon .path=${mdiFilterVariant}></ha-svg-icon>
              </mwc-icon-button>
              <mwc-list-item
                @request-selected="${this._showDisabledChanged}"
                graphic="control"
                .selected=${this._showDisabled}
              >
                <ha-checkbox
                  slot="graphic"
                  .checked=${this._showDisabled}
                ></ha-checkbox>
                ${this.hass!.localize(
                  "ui.panel.config.entities.picker.filter.show_disabled"
                )}
              </mwc-list-item>
              <mwc-list-item
                @request-selected="${this._showRestoredChanged}"
                graphic="control"
                .selected=${this._showUnavailable}
              >
                <ha-checkbox
                  slot="graphic"
                  .checked=${this._showUnavailable}
                ></ha-checkbox>
                ${this.hass!.localize(
                  "ui.panel.config.entities.picker.filter.show_unavailable"
                )}
              </mwc-list-item>
              <mwc-list-item
                @request-selected="${this._showReadOnlyChanged}"
                graphic="control"
                .selected=${this._showReadOnly}
              >
                <ha-checkbox
                  slot="graphic"
                  .checked=${this._showReadOnly}
                ></ha-checkbox>
                ${this.hass!.localize(
                  "ui.panel.config.entities.picker.filter.show_readonly"
                )}
              </mwc-list-item>
            </ha-button-menu>`}
        ${includeZHAFab
          ? html`<a href="/config/zha/add" slot="fab">
              <ha-fab
                .label=${this.hass.localize("ui.panel.config.zha.add_device")}
                extended
                ?rtl=${computeRTL(this.hass)}
              >
                <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
              </ha-fab>
            </a>`
          : html``}
      </hass-tabs-subpage-data-table>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    loadEntityEditorDialog();
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
          area_id: null,
          config_entry_id: null,
          device_id: null,
          icon: null,
          readonly: true,
          selectable: false,
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
    const entry = this._entities!.find(
      (entity) => entity.entity_id === entityId
    );
    this.getDialog = showEntityEditorDialog(this, {
      entry,
      entity_id: entityId,
    });
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
          height: 58px;
          border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
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
        }
        .table-header .selected-txt {
          margin-top: 20px;
        }
        .header-toolbar .selected-txt {
          font-size: 16px;
        }
        .header-toolbar .header-btns {
          margin-right: -12px;
        }
        .header-btns > mwc-button,
        .header-btns > mwc-icon-button {
          margin: 8px;
        }
        ha-button-menu {
          margin: 0 -8px 0 8px;
        }
      `,
    ];
  }
}
