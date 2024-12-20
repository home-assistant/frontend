import {
  mdiDelete,
  mdiDotsVertical,
  mdiDownload,
  mdiHarddisk,
  mdiPlus,
  mdiUpload,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import { storage } from "../../../common/decorators/storage";
import { fireEvent, type HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { navigate } from "../../../common/navigate";
import { capitalizeFirstLetter } from "../../../common/string/capitalize-first-letter";
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
} from "../../../data/backup";
import type { ManagerStateEvent } from "../../../data/backup_manager";
import type { CloudStatus } from "../../../data/cloud";
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

type BackupType = "automatic" | "manual" | "imported";

const TYPE_ORDER: Array<BackupType> = ["automatic", "manual", "imported"];

@customElement("ha-config-backup-backups")
class HaConfigBackupBackups extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus!: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public manager!: ManagerStateEvent;

  @property({ attribute: false }) public backups: BackupContent[] = [];

  @property({ attribute: false }) public config?: BackupConfig;

  @state() private _selected: string[] = [];

  @storage({ key: "backups-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string = "formatted_type";

  @storage({
    key: "backups-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed: string[] = [];

  @state() private _searchParams = new URLSearchParams(window.location.search);

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("location-changed", this._locationChanged);
    window.addEventListener("popstate", this._popState);
    this._searchParams = new URLSearchParams(window.location.search);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._locationChanged);
    window.removeEventListener("popstate", this._popState);
  }

  private _locationChanged = () => {
    if (window.location.search.substring(1) !== this._searchParams.toString()) {
      this._searchParams = new URLSearchParams(window.location.search);
    }
  };

  private _popState = () => {
    if (window.location.search.substring(1) !== this._searchParams.toString()) {
      this._searchParams = new URLSearchParams(window.location.search);
    }
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
        title: "Type",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      locations: {
        title: "Locations",
        showNarrow: true,
        minWidth: "60px",
        maxWidth: "120px",
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
                    slot="graphic"
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

  private _groupOrder = memoizeOne((activeGrouping: string | undefined) =>
    activeGrouping === "formatted_type"
      ? TYPE_ORDER.map((type) => this._formatBackupType(type))
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

  private _formatBackupType(type: BackupType): string {
    // Todo translate
    return capitalizeFirstLetter(type);
  }

  private _data = memoizeOne(
    (backups: BackupContent[], searchParams: URLSearchParams): BackupRow[] => {
      const type = searchParams.get("type")?.toLowerCase();
      let filteredBackups = backups;
      if (type) {
        filteredBackups = filteredBackups.filter(
          (backup) =>
            backup.with_automatic_settings === (type === "automatic") ||
            (backup.with_automatic_settings === null && type === "manual")
        );
      }
      return filteredBackups.map((backup) => ({
        ...backup,
        formatted_type: this._formatBackupType(
          backup.with_automatic_settings ? "automatic" : "manual"
        ),
      }));
    }
  );

  protected render(): TemplateResult {
    const backupInProgress =
      "state" in this.manager && this.manager.state === "in_progress";

    return html`
      <hass-tabs-subpage-data-table
        hasFab
        .tabs=${[
          {
            translationKey: "ui.panel.config.backup.caption",
            path: `/config/backup/list`,
          },
        ]}
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config/backup/overview"
        clickable
        id="backup_id"
        selectable
        .selected=${this._selected.length}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .groupOrder=${this._groupOrder(this._activeGrouping)}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        @selection-changed=${this._handleSelectionChanged}
        .route=${this.route}
        @row-click=${this._showBackupDetails}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._data(this.backups, this._searchParams)}
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
              Upload backup
            </ha-list-item>
          </ha-button-menu>
        </div>

        ${this._selected.length
          ? html`<div
              class=${classMap({
                "header-toolbar": this.narrow,
                "table-header": !this.narrow,
              })}
              slot="header"
            >
              <p class="selected-txt">
                ${this._selected.length} backups selected
              </p>
              <div class="header-btns">
                ${!this.narrow
                  ? html`
                      <ha-button @click=${this._deleteSelected} class="warning">
                        Delete selected
                      </ha-button>
                    `
                  : html`
                      <ha-icon-button
                        .label=${"Delete selected"}
                        .path=${mdiDelete}
                        id="delete-btn"
                        class="warning"
                        @click=${this._deleteSelected}
                      ></ha-icon-button>
                      <simple-tooltip animation-delay="0" for="delete-btn">
                        Delete selected
                      </simple-tooltip>
                    `}
              </div>
            </div> `
          : nothing}
        ${!this._needsOnboarding
          ? html`
              <ha-fab
                slot="fab"
                ?disabled=${backupInProgress}
                .label=${"Backup now"}
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
      title: "Delete backup",
      text: "This backup will be permanently deleted.",
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });

    if (!confirm) {
      return;
    }

    await deleteBackup(this.hass, backup.backup_id);
    fireEvent(this, "ha-refresh-backup-info");
  }

  private async _deleteSelected() {
    const confirm = await showConfirmationDialog(this, {
      title: "Delete selected backups",
      text: "These backups will be permanently deleted.",
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
        title: "Failed to delete backups",
        text: extractApiErrorMessage(err),
      });
      return;
    }
    fireEvent(this, "ha-refresh-backup-info");
    this._dataTable.clearSelection();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .header {
          padding: 16px 16px 0 16px;
          display: flex;
          flex-direction: row;
          gap: 16px;
          background-color: var(--primary-background-color);
        }
        @media (max-width: 1000px) {
          .header {
            flex-direction: column;
          }
        }
        .header > * {
          flex: 1;
          min-width: 0;
        }

        ha-fab[disabled] {
          --mdc-theme-secondary: var(--disabled-text-color) !important;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: var(--header-height);
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
          color: var(--primary-text-color);
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
        }
        .header-btns > ha-button,
        .header-btns > ha-icon-button {
          margin: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-backups": HaConfigBackupBackups;
  }
}
