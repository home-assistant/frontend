import { mdiDelete, mdiDownload, mdiPlus } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoize from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-svg-icon";
import { getSignedPath } from "../../../data/auth";
import {
  BackupContent,
  BackupData,
  fetchBackupInfo,
  generateBackup,
  getBackupDownloadUrl,
  removeBackup,
} from "../../../data/backup";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../types";
import { fileDownload } from "../../../util/file_download";
import { configSections } from "../ha-panel-config";

@customElement("ha-config-backup")
class HaConfigBackup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _backupData?: BackupData;

  private _columns = memoize(
    (narrow, _language): DataTableColumnContainer => ({
      name: {
        title: this.hass.localize("ui.panel.config.backup.name"),
        sortable: true,
        filterable: true,
        grows: true,
        template: (entry: string, backup: BackupContent) =>
          html`${entry}
            <div class="secondary">${backup.path}</div>`,
      },
      size: {
        title: this.hass.localize("ui.panel.config.backup.size"),
        width: "15%",
        hidden: narrow,
        filterable: true,
        sortable: true,
        template: (entry: number) => Math.ceil(entry * 10) / 10 + " MB",
      },
      date: {
        title: this.hass.localize("ui.panel.config.backup.created"),
        width: "15%",
        direction: "desc",
        hidden: narrow,
        filterable: true,
        sortable: true,
        template: (entry: string) =>
          relativeTime(new Date(entry), this.hass.locale),
      },

      actions: {
        title: "",
        width: "15%",
        template: (_: string, backup: BackupContent) =>
          html` <ha-icon-overflow-menu
            .hass=${this.hass}
            .narrow=${this.narrow}
            .items=${[
              // Download Button
              {
                path: mdiDownload,
                label: this.hass.localize(
                  "ui.panel.config.backup.download_backup"
                ),
                action: () => this._downloadBackup(backup),
              },
              // Delete button
              {
                path: mdiDelete,
                label: this.hass.localize(
                  "ui.panel.config.backup.remove_backup"
                ),
                action: () => this._removeBackup(backup),
              },
            ]}
            style="color: var(--secondary-text-color)"
          >
          </ha-icon-overflow-menu>`,
      },
    })
  );

  private _getItems = memoize((backupItems: BackupContent[]) =>
    backupItems.map((backup) => ({
      name: backup.name,
      slug: backup.slug,
      date: backup.date,
      size: backup.size,
      path: backup.path,
    }))
  );

  protected render(): TemplateResult {
    if (!this.hass || this._backupData === undefined) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.backup}
        .columns=${this._columns(this.narrow, this.hass.language)}
        .data=${this._getItems(this._backupData.backups)}
        .noDataText=${this.hass.localize("ui.panel.config.backup.no_bakcups")}
      >
        <ha-fab
          slot="fab"
          .label=${this.hass.localize("ui.panel.config.backup.create_backup")}
          extended
          @click=${this._generateBackup}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._getBackups();
  }

  private async _getBackups(): Promise<void> {
    this._backupData = await fetchBackupInfo(this.hass);
  }

  private async _downloadBackup(backup: BackupContent): Promise<void> {
    const signedUrl = await getSignedPath(
      this.hass,
      getBackupDownloadUrl(backup.slug)
    );
    fileDownload(signedUrl.path);
  }

  private async _generateBackup(): Promise<void> {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.backup.create.title"),
      text: this.hass.localize("ui.panel.config.backup.create.description"),
      confirmText: this.hass.localize("ui.panel.config.backup.create.confirm"),
    });
    if (!confirm) {
      return;
    }

    try {
      await generateBackup(this.hass);
    } catch (err) {
      showAlertDialog(this, { text: (err as Error).message });
      return;
    }
    await this._getBackups();
  }

  private async _removeBackup(backup: BackupContent): Promise<void> {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.backup.remove.title"),
      text: this.hass.localize("ui.panel.config.backup.remove.description", {
        name: backup.name,
      }),
      confirmText: this.hass.localize("ui.panel.config.backup.remove.confirm"),
    });
    if (!confirm) {
      return;
    }

    await removeBackup(this.hass, backup.slug);
    await this._getBackups();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup": HaConfigBackup;
  }
}
