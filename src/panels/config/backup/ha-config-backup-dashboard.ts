import {
  mdiDatabase,
  mdiDelete,
  mdiDotsVertical,
  mdiDownload,
  mdiPlus,
  mdiUpload,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { relativeTime } from "../../../common/datetime/relative_time";
import { storage } from "../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
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
  fetchBackupConfig,
  fetchBackupInfo,
  generateBackup,
  generateBackupWithStrategySettings,
  getBackupDownloadUrl,
  getPreferredAgentForDownload,
  isLocalAgent,
} from "../../../data/backup";
import type { ManagerStateEvent } from "../../../data/backup_manager";
import {
  DEFAULT_MANAGER_STATE,
  subscribeBackupEvents,
} from "../../../data/backup_manager";
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
import { showToast } from "../../../util/toast";
import "./components/ha-backup-summary-card";
import "./components/ha-backup-summary-progress";
import "./components/ha-backup-summary-status";
import { showBackupOnboardingDialog } from "./dialogs/show-dialog-backup_onboarding";
import { showGenerateBackupDialog } from "./dialogs/show-dialog-generate-backup";
import { showNewBackupDialog } from "./dialogs/show-dialog-new-backup";
import { showUploadBackupDialog } from "./dialogs/show-dialog-upload-backup";
import { capitalizeFirstLetter } from "../../../common/string/capitalize-first-letter";

interface BackupRow extends BackupContent {
  formatted_type: string;
}

type BackupType = "strategy" | "custom";

const TYPE_ORDER: Array<BackupType> = ["strategy", "custom"];

@customElement("ha-config-backup-dashboard")
class HaConfigBackupDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _manager: ManagerStateEvent = DEFAULT_MANAGER_STATE;

  @state() private _backups: BackupContent[] = [];

  @state() private _fetching = false;

  @state() private _selected: string[] = [];

  @state() private _config?: BackupConfig;

  @storage({ key: "backups-table-grouping", state: false, subscribe: false })
  private _activeGrouping?: string = "formatted_type";

  @storage({
    key: "backups-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string;

  private _subscribed?: Promise<() => void>;

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

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
                    .path=${mdiDatabase}
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

  private _data = memoizeOne((backups: BackupContent[]): BackupRow[] =>
    backups.map((backup) => ({
      ...backup,
      formatted_type: this._formatBackupType(
        backup.with_strategy_settings ? "strategy" : "custom"
      ),
    }))
  );

  protected render(): TemplateResult {
    const backupInProgress =
      "state" in this._manager && this._manager.state === "in_progress";

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
        back-path="/config/system"
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
        .data=${this._data(this._backups)}
        .noDataText=${this.hass.localize("ui.panel.config.backup.no_backups")}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.backup.picker.search"
        )}
      >
        <div slot="top-header" class="header">
          ${this._fetching
            ? html`
                <ha-backup-summary-card
                  heading="Loading backups"
                  description="Your backup information is being retrieved."
                  has-action
                  status="loading"
                >
                  <ha-button
                    slot="action"
                    @click=${this._configureBackupStrategy}
                  >
                    Configure
                  </ha-button>
                </ha-backup-summary-card>
              `
            : backupInProgress
              ? html`
                  <ha-backup-summary-progress
                    .hass=${this.hass}
                    .manager=${this._manager}
                    has-action
                  >
                    <ha-button
                      slot="action"
                      @click=${this._configureBackupStrategy}
                    >
                      Configure
                    </ha-button>
                  </ha-backup-summary-progress>
                `
              : this._needsOnboarding
                ? html`
                    <ha-backup-summary-card
                      heading="Configure backup strategy"
                      description="Have a one-click backup automation with selected data and locations."
                      has-action
                      status="info"
                    >
                      <ha-button
                        slot="action"
                        @click=${this._setupBackupStrategy}
                      >
                        Setup backup strategy
                      </ha-button>
                    </ha-backup-summary-card>
                  `
                : html`
                    <ha-backup-summary-status
                      .hass=${this.hass}
                      .backups=${this._backups}
                      has-action
                    >
                      <ha-button
                        slot="action"
                        @click=${this._configureBackupStrategy}
                      >
                        Configure
                      </ha-button>
                    </ha-backup-summary-status>
                  `}
        </div>

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

        <ha-fab
          slot="fab"
          ?disabled=${backupInProgress}
          .label=${this.hass.localize("ui.panel.config.backup.create_backup")}
          extended
          @click=${this._newBackup}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _unsubscribeEvents() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
  }

  private async _subscribeEvents() {
    this._unsubscribeEvents();
    if (!this.isConnected) {
      return;
    }

    this._subscribed = subscribeBackupEvents(this.hass!, (event) => {
      this._manager = event;
      if ("state" in event) {
        if (event.state === "completed" || event.state === "failed") {
          this._fetchBackupInfo();
        }
        if (event.state === "failed") {
          let message = "";
          switch (this._manager.manager_state) {
            case "create_backup":
              message = "Failed to create backup";
              break;
            case "restore_backup":
              message = "Failed to restore backup";
              break;
            case "receive_backup":
              message = "Failed to upload backup";
              break;
          }
          if (message) {
            showToast(this, { message });
          }
        }
      }
    });
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetching = true;
    this._fetchBackupInfo().then(() => {
      this._fetching = false;
    });
    this._subscribeEvents();
    this._fetchBackupConfig();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._fetchBackupInfo();
      this._subscribeEvents();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribeEvents();
  }

  private async _fetchBackupInfo() {
    const info = await fetchBackupInfo(this.hass);
    this._backups = info.backups;
  }

  private async _fetchBackupConfig() {
    const { config } = await fetchBackupConfig(this.hass);
    this._config = config;
  }

  private get _needsOnboarding() {
    return this._config && !this._config.create_backup.password;
  }

  private async _uploadBackup(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    await showUploadBackupDialog(this, {});
  }

  private async _newBackup(): Promise<void> {
    if (this._needsOnboarding) {
      const success = await showBackupOnboardingDialog(this, {});
      if (!success) {
        return;
      }
    }

    await this._fetchBackupConfig();

    const config = this._config!;

    const type = await showNewBackupDialog(this, { config });

    if (!type) {
      return;
    }

    if (type === "custom") {
      const params = await showGenerateBackupDialog(this, {});

      if (!params) {
        return;
      }

      if (!isComponentLoaded(this.hass, "hassio")) {
        delete params.include_folders;
        delete params.include_all_addons;
        delete params.include_addons;
      }

      await generateBackup(this.hass, params);
      await this._fetchBackupInfo();
      return;
    }
    if (type === "strategy") {
      await generateBackupWithStrategySettings(this.hass);
      await this._fetchBackupInfo();
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
    this._fetchBackupInfo();
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
    await this._fetchBackupInfo();
    this._dataTable.clearSelection();
  }

  private _configureBackupStrategy() {
    navigate("/config/backup/strategy");
  }

  private async _setupBackupStrategy() {
    const success = await showBackupOnboardingDialog(this, {});
    if (!success) {
      return;
    }

    await this._fetchBackupConfig();
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
    "ha-config-backup-dashboard": HaConfigBackupDashboard;
  }
}
