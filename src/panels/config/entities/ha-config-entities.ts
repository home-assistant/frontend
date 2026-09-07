import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume } from "@lit/context";
import {
  mdiChevronRight,
  mdiDelete,
  mdiDotsVertical,
  mdiEye,
  mdiEyeOff,
  mdiMenuDown,
  mdiPlus,
  mdiRestore,
  mdiToggleSwitch,
  mdiToggleSwitchOffOutline,
} from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { storage } from "../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import {
  deleteEntity,
  isDeletableEntity,
} from "../../../common/entity/delete_entity";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { getHistoryState, updateHistoryState } from "../../../common/navigate";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../../common/util/promise-all-settled-results";
import type {
  RowClickedEvent,
  SelectionChangedEvent,
  SortingChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button";
import "../../../components/ha-check-list-item";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-sub-menu";
import "../../../components/ha-svg-icon";
import type { CloudStatus } from "../../../data/cloud";
import type { ConfigEntry } from "../../../data/config_entries";
import { getConfigEntries } from "../../../data/config_entries";
import { fullEntitiesContext, labelsContext } from "../../../data/context";
import type { DataTableFiltersValues } from "../../../data/data_table_filters";
import type {
  EntityRegistryEntry,
  UpdateEntityRegistryEntryResult,
} from "../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../data/entity/entity_registry";
import { HELPERS_CRUD } from "../../../data/helpers_crud";
import type { IntegrationManifest } from "../../../data/integration";
import { fetchIntegrationManifests } from "../../../data/integration";
import type { LabelRegistryEntry } from "../../../data/label/label_registry";
import { createLabelRegistryEntry } from "../../../data/label/label_registry";
import { regenerateEntityIds } from "../../../data/regenerate_entity_ids";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { configSections } from "../config-sections";
import type { Helper } from "../helpers/const";
import { isHelperDomain } from "../helpers/const";
import "../integrations/ha-integration-overflow-menu";
import { showAddIntegrationDialog } from "../integrations/show-add-integration-dialog";
import { showLabelDetailDialog } from "../labels/show-dialog-label-detail";
import "./ha-entity-table";
import type {
  EntityTableFilterContext,
  HaEntityTable,
} from "./ha-entity-table";

@customElement("ha-config-entities")
export class HaConfigEntities extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;
  @property({ type: Boolean }) public narrow = false;
  @property({ attribute: false }) public route!: Route;
  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @state() private _entries?: ConfigEntry[];
  @state() private _manifests?: IntegrationManifest[];

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entities!: EntityRegistryEntry[];

  @consume({ context: labelsContext, subscribe: true })
  @state()
  _labels?: LabelRegistryEntry[];

  @state()
  @storage({
    storage: "sessionStorage",
    key: "entities-table-search",
    state: true,
    subscribe: false,
  })
  private _filter: string = getHistoryState()?.filter || "";

  @state() private _searchParms = new URLSearchParams(window.location.search);
  @state() private _filters: DataTableFiltersValues = {};

  @storage({
    storage: "sessionStorage",
    key: "entities-table-filters",
    state: false,
    subscribe: false,
  })
  private _storageFilters: DataTableFiltersValues = {};

  @state() private _selected: string[] = [];
  @state() private _filterContext: EntityTableFilterContext = {
    filteredDomains: new Set(),
    filteredConfigEntry: undefined,
  };

  @storage({ key: "entities-table-sort", state: false, subscribe: false })
  private _activeSorting?: SortingChangedEvent;
  @storage({ key: "entities-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string;
  @storage({ key: "entities-table-collapsed", state: false, subscribe: false })
  private _activeCollapsed?: string[];
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

  @query("ha-entity-table") private _dataTable?: HaEntityTable;

  private _fromUrl = false;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("location-changed", this._locationChanged);
    window.addEventListener("popstate", this._popState);
  }

  public disconnectedCallback() {
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
            ${label.icon ? html`<ha-icon slot="icon" .icon=${label.icon}></ha-icon>` : nothing}
            ${label.name}
          </ha-label>
        </ha-dropdown-item>`;
      })}
      <wa-divider .slot=${slot}></wa-divider>
      <ha-dropdown-item .slot=${slot} value="label_create">
        ${this.hass.localize("ui.panel.config.labels.add_label")}
      </ha-dropdown-item>`;

  protected render() {
    const includeAddDeviceFab =
      this._filterContext.filteredDomains.size === 1 &&
      (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
        [...this._filterContext.filteredDomains][0]
      );

    return html`
      <ha-entity-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.devices}
        .cloudStatus=${this.cloudStatus}
        .filterValues=${this._filters}
        @entity-table-filters-changed=${this._filterChanged}
        @entity-table-filter-context-changed=${this._filterContextChanged}
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
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._openEditEntry}
        .hasFab=${includeAddDeviceFab}
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
                  .label=${this.hass.localize("ui.panel.config.automation.picker.bulk_actions.add_label")}
                >
                  <ha-svg-icon
                    slot="trailing-icon"
                    .path=${mdiMenuDown}
                  ></ha-svg-icon>
                </ha-assist-chip>
                ${this._renderLabelItems()}
              </ha-dropdown>`
            : nothing
        }
        <ha-dropdown slot="selection-bar" @wa-select=${this._handleBulkAction}>
          ${
            this.narrow
              ? html`<ha-assist-chip
                  .label=${this.hass.localize("ui.panel.config.automation.picker.bulk_action")}
                  slot="trigger"
                >
                  <ha-svg-icon
                    slot="trailing-icon"
                    .path=${mdiMenuDown}
                  ></ha-svg-icon>
                </ha-assist-chip>`
              : html`<ha-icon-button
                  .path=${mdiDotsVertical}
                  .label=${this.hass.localize("ui.panel.config.automation.picker.bulk_action")}
                  slot="trigger"
                ></ha-icon-button>`
          }
          ${
            this.narrow
              ? html`<ha-dropdown-item>
                    ${this.hass.localize("ui.panel.config.automation.picker.bulk_actions.add_label")}
                    <ha-svg-icon
                      slot="end"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                    ${this._renderLabelItems("submenu")} </ha-dropdown-item
                  ><wa-divider></wa-divider>`
              : nothing
          }
          <ha-dropdown-item value="enable_selected">
            <ha-svg-icon slot="icon" .path=${mdiToggleSwitch}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.entities.picker.enable_selected.button")}
          </ha-dropdown-item>
          <ha-dropdown-item value="disable_selected">
            <ha-svg-icon
              slot="icon"
              .path=${mdiToggleSwitchOffOutline}
            ></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.entities.picker.disable_selected.button")}
          </ha-dropdown-item>
          <wa-divider></wa-divider>
          <ha-dropdown-item value="unhide_selected">
            <ha-svg-icon slot="icon" .path=${mdiEye}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.entities.picker.unhide_selected.button")}
          </ha-dropdown-item>
          <ha-dropdown-item value="hide_selected">
            <ha-svg-icon slot="icon" .path=${mdiEyeOff}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.entities.picker.hide_selected.button")}
          </ha-dropdown-item>
          <wa-divider></wa-divider>
          <ha-dropdown-item value="restore_entity_id_selected">
            <ha-svg-icon slot="icon" .path=${mdiRestore}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.entities.picker.restore_entity_id_selected.button")}
          </ha-dropdown-item>
          <wa-divider></wa-divider>
          <ha-dropdown-item value="delete_selected" variant="danger">
            <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.entities.picker.delete_selected.button")}
          </ha-dropdown-item>
        </ha-dropdown>
        ${
          includeAddDeviceFab
            ? html`<ha-button size="l" @click=${this._addDevice} slot="fab">
                <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                ${this.hass.localize("ui.panel.config.devices.add_device")}
              </ha-button>`
            : nothing
        }
      </ha-entity-table>
    `;
  }

  private _filterChanged(
    ev: HASSDomEvent<HASSDomEvents["entity-table-filters-changed"]>
  ) {
    this._filters = ev.detail.value;
    if (!this._fromUrl) {
      this._storageFilters = this._filters;
    }
  }

  private _filterContextChanged(ev: HASSDomEvent<EntityTableFilterContext>) {
    this._filterContext = ev.detail;
  }

  protected firstUpdated() {
    this._setFiltersFromUrl();
    if (Object.keys(this._filters).length) {
      return;
    }
    this._filters = { "ha-filter-states": ["enabled"] };
  }

  protected willUpdate() {
    if (!this.hasUpdated) {
      this._filters = this._storageFilters;
      this._setFiltersFromUrl();
    }
  }

  private _setFiltersFromUrl() {
    const area = this._searchParms.get("area");
    const domain = this._searchParms.get("domain");
    const configEntry = this._searchParms.get("config_entry");
    const subEntry = this._searchParms.get("sub_entry");
    const device = this._searchParms.get("device");
    const label = this._searchParms.get("label");
    const voiceAssistant = this._searchParms.get("voice_assistant");
    if (!area && !domain && !configEntry && !label && !device) {
      return;
    }
    this._fromUrl = true;
    this._filter = getHistoryState()?.filter || "";
    this._filters = {
      "ha-filter-states": [],
      "ha-filter-floor-areas": area ? { areas: [area] } : undefined,
      "ha-filter-integrations": domain ? [domain] : [],
      "ha-filter-devices": device ? [device] : [],
      "ha-filter-labels": label ? [label] : [],
      "ha-filter-voice-assistants": voiceAssistant ? [voiceAssistant] : [],
      config_entry: configEntry ? [configEntry] : [],
      sub_entry: subEntry ? [subEntry] : [],
    };
  }

  private _handleSearchChange(ev: HASSDomEvent<{ value: string }>) {
    this._filter = ev.detail.value;
    updateHistoryState({ filter: this._filter });
  }

  private _handleSelectionChanged(ev: HASSDomEvent<SelectionChangedEvent>) {
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
              { disabled_by: null }
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
              { number: rejected.length }
            ),
            text: html`<pre>
    ${rejected.map((r) => r.reason.message || r.reason.code || r.reason).join("\r\n")}</pre>`,
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
          updateEntityRegistryEntry(this.hass, entity, { disabled_by: "user" })
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
          updateEntityRegistryEntry(this.hass, entity, { hidden_by: "user" })
        );
        this._clearSelection();
      },
    });
  };

  private _unhideSelected = () => {
    this._selected.forEach((entity) =>
      updateEntityRegistryEntry(this.hass, entity, { hidden_by: null })
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
    const action = (
      ev.detail.item as typeof ev.detail.item & { action: "add" | "remove" }
    ).action;
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
${rejected.map((r) => r.reason.message || r.reason.code || r.reason).join("\r\n")}</pre>`,
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
        "ui.panel.config.entities.picker.delete_selected.confirm_title"
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
    this._dataTable?.clearSelection();
  }

  private _openEditEntry(ev: HASSDomEvent<RowClickedEvent>) {
    showMoreInfoDialog(this, { entityId: ev.detail.id });
  }

  private async _loadConfigEntries() {
    this._entries = await getConfigEntries(this.hass);
  }

  private _addDevice() {
    const { filteredConfigEntry, filteredDomains } = this._filterContext;
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
      navigateToResult: true,
    });
  }

  private _handleSortingChanged(ev: HASSDomEvent<SortingChangedEvent>) {
    this._activeSorting = ev.detail;
  }
  private _handleGroupingChanged(ev: HASSDomEvent<{ value: string }>) {
    this._activeGrouping = ev.detail.value;
  }
  private _handleCollapseChanged(ev: HASSDomEvent<{ value: string[] }>) {
    this._activeCollapsed = ev.detail.value;
  }
  private _handleColumnsChanged(
    ev: HASSDomEvent<HASSDomEvents["columns-changed"]>
  ) {
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
    }
  }

  static styles = [
    haStyle,
    css`
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
        --md-assist-chip-trailing-space: 8px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-entities": HaConfigEntities;
  }
}
