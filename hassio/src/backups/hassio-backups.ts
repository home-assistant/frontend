import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiBackupRestore, mdiDelete, mdiDotsVertical, mdiPlus } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import { relativeTime } from "../../../src/common/datetime/relative_time";
import { HASSDomEvent } from "../../../src/common/dom/fire_event";
import {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../src/components/data-table/ha-data-table";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-fab";
import "../../../src/components/ha-icon-button";
import "../../../src/components/ha-svg-icon";
import {
  HassioBackup,
  fetchHassioBackups,
  friendlyFolderName,
  reloadHassioBackups,
  removeBackup,
} from "../../../src/data/hassio/backup";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../src/layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import { showBackupUploadDialog } from "../dialogs/backup/show-dialog-backup-upload";
import { showHassioBackupLocationDialog } from "../dialogs/backup/show-dialog-hassio-backu-location";
import { showHassioBackupDialog } from "../dialogs/backup/show-dialog-hassio-backup";
import { showHassioCreateBackupDialog } from "../dialogs/backup/show-dialog-hassio-create-backup";
import { supervisorTabs } from "../hassio-tabs";
import { hassioStyle } from "../resources/hassio-style";

type BackupItem = HassioBackup & {
  secondary: string;
};

@customElement("hassio-backups")
export class HassioBackups extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @state() private _selectedBackups: string[] = [];

  @state() private _backups?: HassioBackup[] = [];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  private _firstUpdatedCalled = false;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && this._firstUpdatedCalled) {
      this.refreshData();
    }
  }

  public async refreshData() {
    await reloadHassioBackups(this.hass);
    await this.fetchBackups();
  }

  private _computeBackupContent = (backup: HassioBackup): string => {
    if (backup.type === "full") {
      return this.supervisor.localize("backup.full_backup");
    }
    const content: string[] = [];
    if (backup.content.homeassistant) {
      content.push("Home Assistant");
    }
    if (backup.content.folders.length !== 0) {
      for (const folder of backup.content.folders) {
        content.push(friendlyFolderName[folder] || folder);
      }
    }

    if (backup.content.addons.length !== 0) {
      for (const addon of backup.content.addons) {
        content.push(
          this.supervisor.addon.addons.find((entry) => entry.slug === addon)
            ?.name || addon
        );
      }
    }

    return content.join(", ");
  };

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (this.hass && this.isConnected) {
      this.refreshData();
    }
    this._firstUpdatedCalled = true;
  }

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer<BackupItem> => ({
      name: {
        title: this.supervisor.localize("backup.name"),
        main: true,
        sortable: true,
        filterable: true,
        grows: true,
        template: (backup) =>
          html`${backup.name || backup.slug}
            <div class="secondary">${backup.secondary}</div>`,
      },
      size: {
        title: this.supervisor.localize("backup.size"),
        width: "15%",
        hidden: narrow,
        filterable: true,
        sortable: true,
        template: (backup) => Math.ceil(backup.size * 10) / 10 + " MB",
      },
      location: {
        title: this.supervisor.localize("backup.location"),
        width: "15%",
        hidden: narrow,
        filterable: true,
        sortable: true,
        template: (backup) =>
          backup.location || this.supervisor.localize("backup.data_disk"),
      },
      date: {
        title: this.supervisor.localize("backup.created"),
        width: "15%",
        direction: "desc",
        hidden: narrow,
        filterable: true,
        sortable: true,
        template: (backup) =>
          relativeTime(new Date(backup.date), this.hass.locale),
      },
      secondary: {
        title: "",
        hidden: true,
        filterable: true,
      },
    })
  );

  private _backupData = memoizeOne((backups: HassioBackup[]): BackupItem[] =>
    backups.map((backup) => ({
      ...backup,
      secondary: this._computeBackupContent(backup),
    }))
  );

  protected render() {
    if (!this.supervisor) {
      return nothing;
    }
    return html`
      <hass-tabs-subpage-data-table
        .tabs=${atLeastVersion(this.hass.config.version, 2022, 5)
          ? [
              {
                translationKey: "panel.backups",
                path: `/hassio/backups`,
                iconPath: mdiBackupRestore,
              },
            ]
          : supervisorTabs(this.hass)}
        .hass=${this.hass}
        .localizeFunc=${this.supervisor.localize}
        .searchLabel=${this.supervisor.localize("backup.search")}
        .noDataText=${this.supervisor.localize("backup.no_backups")}
        .narrow=${this.narrow}
        .route=${this.route}
        .columns=${this._columns(this.narrow)}
        .data=${this._backupData(this._backups || [])}
        id="slug"
        @row-click=${this._handleRowClicked}
        @selection-changed=${this._handleSelectionChanged}
        clickable
        selectable
        hasFab
        .mainPage=${!atLeastVersion(this.hass.config.version, 2021, 12)}
        back-path=${atLeastVersion(this.hass.config.version, 2022, 5)
          ? "/config/system"
          : "/config"}
        supervisor
      >
        <ha-button-menu slot="toolbar-icon" @action=${this._handleAction}>
          <ha-icon-button
            .label=${this.supervisor?.localize("common.menu")}
            .path=${mdiDotsVertical}
            slot="trigger"
          ></ha-icon-button>
          <mwc-list-item>
            ${this.supervisor.localize("common.reload")}
          </mwc-list-item>
          <mwc-list-item>
            ${this.supervisor.localize("dialog.backup_location.title")}
          </mwc-list-item>
          ${atLeastVersion(this.hass.config.version, 0, 116)
            ? html`<mwc-list-item>
                ${this.supervisor.localize("backup.upload_backup")}
              </mwc-list-item>`
            : ""}
        </ha-button-menu>

        ${this._selectedBackups.length
          ? html`<div
              class=${classMap({
                "header-toolbar": this.narrow,
                "table-header": !this.narrow,
              })}
              slot="header"
            >
              <p class="selected-txt">
                ${this.supervisor.localize("backup.selected", {
                  number: this._selectedBackups.length,
                })}
              </p>
              <div class="header-btns">
                ${!this.narrow
                  ? html`
                      <mwc-button
                        @click=${this._deleteSelected}
                        class="warning"
                      >
                        ${this.supervisor.localize("backup.delete_selected")}
                      </mwc-button>
                    `
                  : html`
                      <ha-icon-button
                        .label=${this.supervisor.localize(
                          "backup.delete_selected"
                        )}
                        .path=${mdiDelete}
                        id="delete-btn"
                        class="warning"
                        @click=${this._deleteSelected}
                      ></ha-icon-button>
                      <simple-tooltip animation-delay="0" for="delete-btn">
                        ${this.supervisor.localize("backup.delete_selected")}
                      </simple-tooltip>
                    `}
              </div>
            </div> `
          : ""}

        <ha-fab
          slot="fab"
          @click=${this._createBackup}
          .label=${this.supervisor.localize("backup.create_backup")}
          extended
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this.refreshData();
        break;
      case 1:
        showHassioBackupLocationDialog(this, { supervisor: this.supervisor });
        break;
      case 2:
        this._showUploadBackupDialog();
        break;
    }
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selectedBackups = ev.detail.value;
  }

  private _showUploadBackupDialog() {
    showBackupUploadDialog(this, {
      showBackup: (slug: string) =>
        showHassioBackupDialog(this, {
          slug,
          supervisor: this.supervisor,
          onDelete: () => this.fetchBackups(),
        }),
      reloadBackup: () => this.refreshData(),
    });
  }

  private async fetchBackups() {
    await reloadHassioBackups(this.hass);
    this._backups = await fetchHassioBackups(this.hass);
  }

  private async _deleteSelected() {
    const confirm = await showConfirmationDialog(this, {
      title: this.supervisor.localize("backup.delete_backup_title"),
      text: this.supervisor.localize("backup.delete_backup_text", {
        number: this._selectedBackups.length,
      }),
      confirmText: this.supervisor.localize("backup.delete_backup_confirm"),
    });

    if (!confirm) {
      return;
    }

    try {
      await Promise.all(
        this._selectedBackups.map((slug) => removeBackup(this.hass, slug))
      );
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize("backup.failed_to_delete"),
        text: extractApiErrorMessage(err),
      });
      return;
    }
    await reloadHassioBackups(this.hass);
    this._backups = await fetchHassioBackups(this.hass);
    this._dataTable.clearSelection();
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const slug = ev.detail.id;
    showHassioBackupDialog(this, {
      slug,
      supervisor: this.supervisor,
      onDelete: () => this.fetchBackups(),
    });
  }

  private _createBackup() {
    if (this.supervisor!.info.state !== "running") {
      showAlertDialog(this, {
        title: this.supervisor!.localize("backup.could_not_create"),
        text: this.supervisor!.localize("backup.create_blocked_not_running", {
          state: this.supervisor!.info.state,
        }),
      });
      return;
    }
    showHassioCreateBackupDialog(this, {
      supervisor: this.supervisor!,
      onCreate: () => this.fetchBackups(),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
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
        }
        .header-btns > mwc-button,
        .header-btns > ha-icon-button {
          margin: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-backups": HassioBackups;
  }
}
