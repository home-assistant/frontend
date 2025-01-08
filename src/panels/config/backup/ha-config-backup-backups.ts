import {
  mdiDelete,
  mdiDotsVertical,
  mdiDownload,
  mdiHarddisk,
  mdiNas,
  mdiPlus,
  mdiUpload,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import { storage } from "../../../common/decorators/storage";
import { fireEvent, type HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-fab";
import "../../../components/ha-filter-states";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import { getSignedPath } from "../../../data/auth";
import type { BackupConfig, BackupContent } from "../../../data/backup";
import {
  computeBackupAgentName,
  deleteBackup,
  generateBackup,
  generateBackupWithAutomaticSettings,
  getBackupDownloadUrl,
  getPreferredAgentForDownload,
  isLocalAgent,
  isNetworkMountAgent,
} from "../../../data/backup";
import type { ManagerStateEvent } from "../../../data/backup_manager";
import type { CloudStatus } from "../../../data/cloud";
import type { DataTableFiltersValues } from "../../../data/data_table_filters";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { bytesToString } from "../../../util/bytes-to-string";
import { fileDownload } from "../../../util/file_download";
import { showGenerateBackupDialog } from "./dialogs/show-dialog-generate-backup";
import { showNewBackupDialog } from "./dialogs/show-dialog-new-backup";
import { showUploadBackupDialog } from "./dialogs/show-dialog-upload-backup";

interface BackupRow extends DataTableRowData, BackupContent {
  formatted_type: string;
}

type BackupType = "automatic" | "manual";

const TYPE_ORDER: Array<BackupType> = ["automatic", "manual"];

@customElement("ha-config-backup-backups")
class HaConfigBackupBackups extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public manager!: ManagerStateEvent;

  @property({ attribute: false }) public backups: BackupContent[] = [];

  @property({ attribute: false }) public config?: BackupConfig;

  @state() private _selected: string[] = [];

  @storage({
    storage: "sessionStorage",
    key: "backups-table-filters",
    state: true,
    subscribe: false,
  })
  private _filters: DataTableFiltersValues = {};

  @storage({ key: "backups-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string = "formatted_type";

  @storage({
    key: "backups-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed: string[] = [];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("location-changed", this._locationChanged);
    window.addEventListener("popstate", this._popState);
    this._setFiltersFromUrl();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._locationChanged);
    window.removeEventListener("popstate", this._popState);
  }

  private _locationChanged = () => {
    this._setFiltersFromUrl();
  };

  private _popState = () => {
    this._setFiltersFromUrl();
  };

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer<BackupRow> => ({
      name: {
        title: localize("ui.panel.config.backup.name"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 3,
      },
      size: {
        title: localize("ui.panel.config.backup.size"),
        filterable: true,
        sortable: true,
        template: (backup) => bytesToString(backup.size),
      },
      date: {
        title: localize("ui.panel.config.backup.created"),
        direction: "desc",
        filterable: true,
        sortable: true,
        template: (backup) =>
          relativeTime(new Date(backup.date), this.hass.locale),
      },
      formatted_type: {
        title: localize("ui.panel.config.backup.backup_type"),
        filterable: true,
        sortable: true,
        groupable: true,
      },
      locations: {
        title: localize("ui.panel.config.backup.locations"),
        showNarrow: true,
        minWidth: "60px",
        template: (backup) => html`
          <div style="display: flex; gap: 4px;">
            ${(backup.agent_ids || []).map((agentId) => {
              const name = computeBackupAgentName(
                this.hass.localize,
                agentId,
                backup.agent_ids
              );
              if (isLocalAgent(agentId)) {
                return html`
                  <ha-svg-icon
                    .path=${mdiHarddisk}
                    title=${name}
                    style="flex-shrink: 0;"
                  ></ha-svg-icon>
                `;
              }
              if (isNetworkMountAgent(agentId)) {
                return html`
                  <ha-svg-icon
                    .path=${mdiNas}
                    title=${name}
                    style="flex-shrink: 0;"
                  ></ha-svg-icon>
                `;
              }
              const domain = computeDomain(agentId);
              return html`
                <img
                  title=${name}
                  .src=${brandsUrl({
                    domain,
                    type: "icon",
                    useFallback: true,
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  height="24"
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  alt=${name}
                  slot="graphic"
                  style="flex-shrink: 0;"
                />
              `;
            })}
          </div>
        `,
      },
      actions: {
        title: "",
        label: localize("ui.panel.config.generic.headers.actions"),
        showNarrow: true,
        moveable: false,
        hideable: false,
        type: "overflow-menu",
        template: (backup) => html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            narrow
            .items=${[
              {
                label: this.hass.localize("ui.common.download"),
                path: mdiDownload,
                action: () => this._downloadBackup(backup),
              },
              {
                label: this.hass.localize("ui.common.delete"),
                path: mdiDelete,
                action: () => this._deleteBackup(backup),
                warning: true,
              },
            ]}
          >
          </ha-icon-overflow-menu>
        `,
      },
    })
  );

  private _groupOrder = memoizeOne(
    (activeGrouping: string | undefined, localize: LocalizeFunc) =>
      activeGrouping === "formatted_type"
        ? TYPE_ORDER.map((type) =>
            localize(`ui.panel.config.backup.type.${type}`)
          )
        : undefined
  );

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  private _data = memoizeOne(
    (
      backups: BackupContent[],
      filters: DataTableFiltersValues,
      localize: LocalizeFunc
    ): BackupRow[] => {
      const typeFilter = filters["ha-filter-states"] as string[] | undefined;
      let filteredBackups = backups;
      if (typeFilter?.length) {
        filteredBackups = filteredBackups.filter(
          (backup) =>
            (backup.with_automatic_settings &&
              typeFilter.includes("automatic")) ||
            (!backup.with_automatic_settings && typeFilter.includes("manual"))
        );
      }
      return filteredBackups.map((backup) => {
        const type = backup.with_automatic_settings ? "automatic" : "manual";
        return {
          ...backup,
          formatted_type: localize(`ui.panel.config.backup.type.${type}`),
        };
      });
    }
  );

  protected render(): TemplateResult {
    const backupInProgress =
      "state" in this.manager && this.manager.state === "in_progress";

    return html`
      <hass-tabs-subpage-data-table
        has-fab
        .tabs=${[
          {
            name: this.hass.localize("ui.panel.config.backup.backups.header"),
            path: `/config/backup/list`,
          },
        ]}
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/backup/overview"
        clickable
        id="backup_id"
        has-filters
        .filters=${Object.values(this._filters).filter((filter) =>
          Array.isArray(filter)
            ? filter.length
            : filter &&
              Object.values(filter).some((val) =>
                Array.isArray(val) ? val.length : val
              )
        ).length}
        selectable
        .selected=${this._selected.length}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .groupOrder=${this._groupOrder(
          this._activeGrouping,
          this.hass.localize
        )}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        @selection-changed=${this._handleSelectionChanged}
        .route=${this.route}
        @row-click=${this._showBackupDetails}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._data(this.backups, this._filters, this.hass.localize)}
        .noDataText=${this.hass.localize("ui.panel.config.backup.no_backups")}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.backup.picker.search"
        )}
      >
        <div slot="toolbar-icon">
          <ha-button-menu>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-list-item
              graphic="icon"
              @request-selected=${this._uploadBackup}
            >
              <ha-svg-icon slot="graphic" .path=${mdiUpload}></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.backup.backups.menu.upload_backup"
              )}
            </ha-list-item>
          </ha-button-menu>
        </div>

        <div slot="selection-bar">
          ${!this.narrow
            ? html`
                <ha-button @click=${this._deleteSelected} class="warning">
                  ${this.hass.localize(
                    "ui.panel.config.backup.backups.delete_selected"
                  )}
                </ha-button>
              `
            : html`
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.backup.backups.delete_selected"
                  )}
                  .path=${mdiDelete}
                  id="delete-btn"
                  class="warning"
                  @click=${this._deleteSelected}
                ></ha-icon-button>
                <simple-tooltip animation-delay="0" for="delete-btn">
                  ${this.hass.localize(
                    "ui.panel.config.backup.backups.delete_selected"
                  )}
                </simple-tooltip>
              `}
        </div>

        <ha-filter-states
          .hass=${this.hass}
          .label=${this.hass.localize("ui.panel.config.backup.backup_type")}
          .value=${this._filters["ha-filter-states"]}
          .states=${this._states(this.hass.localize)}
          @data-table-filter-changed=${this._filterChanged}
          slot="filter-pane"
          expanded
          .narrow=${this.narrow}
        ></ha-filter-states>
        ${!this._needsOnboarding
          ? html`
              <ha-fab
                slot="fab"
                ?disabled=${backupInProgress}
                .label=${this.hass.localize(
                  "ui.panel.config.backup.backups.new_backup"
                )}
                extended
                @click=${this._newBackup}
              >
                <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
              </ha-fab>
            `
          : nothing}
      </hass-tabs-subpage-data-table>
    `;
  }

  private _states = memoizeOne((localize: LocalizeFunc) =>
    TYPE_ORDER.map((type) => ({
      value: type,
      label: localize(`ui.panel.config.backup.type.${type}`),
    }))
  );

  private _filterChanged(ev) {
    const type = ev.target.localName;
    this._filters = { ...this._filters, [type]: ev.detail.value };
  }

  private _setFiltersFromUrl() {
    const searchParams = new URLSearchParams(window.location.search);
    const type = searchParams.get("type");

    if (!type) {
      return;
    }

    this._filters = {
      "ha-filter-states": type === "all" ? [] : [type],
    };
  }

  private get _needsOnboarding() {
    return !this.config?.create_backup.password;
  }

  private async _uploadBackup(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    await showUploadBackupDialog(this, {});
  }

  private async _newBackup(): Promise<void> {
    const config = this.config!;

    const type = await showNewBackupDialog(this, { config });

    if (!type) {
      return;
    }

    if (type === "manual") {
      const params = await showGenerateBackupDialog(this, {
        cloudStatus: this.cloudStatus,
      });

      if (!params) {
        return;
      }

      await generateBackup(this.hass, params);
      fireEvent(this, "ha-refresh-backup-info");
      return;
    }
    if (type === "automatic") {
      await generateBackupWithAutomaticSettings(this.hass);
      fireEvent(this, "ha-refresh-backup-info");
    }
  }

  private _showBackupDetails(ev: CustomEvent): void {
    const id = (ev.detail as RowClickedEvent).id;
    navigate(`/config/backup/details/${id}`);
  }

  private async _downloadBackup(backup: BackupContent): Promise<void> {
    const preferedAgent = getPreferredAgentForDownload(backup!.agent_ids!);
    const signedUrl = await getSignedPath(
      this.hass,
      getBackupDownloadUrl(backup.backup_id, preferedAgent)
    );
    fileDownload(signedUrl.path);
  }

  private async _deleteBackup(backup: BackupContent): Promise<void> {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.backup.dialogs.delete.title"),
      text: this.hass.localize("ui.panel.config.backup.dialogs.delete.text"),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });

    if (!confirm) {
      return;
    }

    try {
      await deleteBackup(this.hass, backup.backup_id);
      if (this._selected.includes(backup.backup_id)) {
        this._selected = this._selected.filter((id) => id !== backup.backup_id);
      }
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.backup.dialogs.delete.failed"
        ),
        text: extractApiErrorMessage(err),
      });
      return;
    }
    fireEvent(this, "ha-refresh-backup-info");
  }

  private async _deleteSelected() {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.backup.dialogs.delete_selected.title"
      ),
      text: this.hass.localize(
        "ui.panel.config.backup.dialogs.delete_selected.text"
      ),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });

    if (!confirm) {
      return;
    }

    try {
      await Promise.all(
        this._selected.map((slug) => deleteBackup(this.hass, slug))
      );
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.backup.dialogs.delete_selected.failed"
        ),
        text: extractApiErrorMessage(err),
      });
      return;
    }
    fireEvent(this, "ha-refresh-backup-info");
    this._dataTable.clearSelection();
  }

  static get styles(): CSSResultGroup {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-backups": HaConfigBackupBackups;
  }
}
