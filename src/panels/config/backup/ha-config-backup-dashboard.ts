import { mdiDelete, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-svg-icon";
import {
  fetchBackupInfo,
  generateBackup,
  removeBackup,
  type BackupContent,
} from "../../../data/backup";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import "./components/ha-backup-summary-card";
import { showGenerateBackupDialog } from "./dialogs/show-dialog-generate-backup";

@customElement("ha-config-backup-dashboard")
class HaConfigBackupDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _backingUp = false;

  @state() private _backups: BackupContent[] = [];

  @state() private _selected: string[] = [];

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer<BackupContent> => ({
      name: {
        title: localize("ui.panel.config.backup.name"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 2,
        template: (backup) => backup.name,
      },
      size: {
        title: localize("ui.panel.config.backup.size"),
        filterable: true,
        sortable: true,
        template: (backup) => Math.ceil(backup.size * 10) / 10 + " MB",
      },
      date: {
        title: localize("ui.panel.config.backup.created"),
        direction: "desc",
        filterable: true,
        sortable: true,
        template: (backup) =>
          relativeTime(new Date(backup.date), this.hass.locale),
      },
      locations: {
        title: "Locations",
        template: (backup) =>
          html`${(backup.agent_ids || []).map((agent) => {
            const [domain, name] = agent.split(".");
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
          })}`,
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

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selected = ev.detail.value;
  }

  protected render(): TemplateResult {
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
        @selection-changed=${this._handleSelectionChanged}
        .route=${this.route}
        @row-click=${this._showBackupDetails}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._backups ?? []}
        .noDataText=${this.hass.localize("ui.panel.config.backup.no_backups")}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.backup.picker.search"
        )}
      >
        <div slot="top_header" class="header">
          <ha-backup-summary-card
            title="Automatically backed up"
            description="Your configuration has been backed up."
            has-action
            .status=${this._backingUp ? "loading" : "success"}
          >
            <ha-button slot="action" @click=${this._configureAutomaticBackup}>
              Configure
            </ha-button>
          </ha-backup-summary-card>
          <ha-backup-summary-card
            title="3 automatic backup locations"
            description="One is off-site"
            has-action
            .status=${"success"}
          >
            <ha-button slot="action" @click=${this._configureBackupLocations}>
              Configure
            </ha-button>
          </ha-backup-summary-card>
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
          ?disabled=${this._backingUp}
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
    this._fetchBackupInfo();
  }

  private async _fetchBackupInfo() {
    const info = await fetchBackupInfo(this.hass);
    this._backups = info.backups;
    this._backingUp = info.backing_up;
  }

  private async _generateBackup(): Promise<void> {
    const response = await showGenerateBackupDialog(this, {});

    if (!response) {
      return;
    }

    await this._fetchBackupInfo();

    // Todo subscribe for status updates instead of polling
    const interval = setInterval(async () => {
      await this._fetchBackupInfo();
      if (!this._backingUp) {
        clearInterval(interval);
      }
    }, 2000);
  }

  private _showBackupDetails(ev: CustomEvent): void {
    const id = (ev.detail as RowClickedEvent).id;
    navigate(`/config/backup/details/${id}`);
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

    await removeBackup(this.hass, backup.backup_id);
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
        this._selected.map((slug) => removeBackup(this.hass, slug))
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

  private _configureAutomaticBackup() {
    navigate("/config/backup/automatic-config");
  }

  private _configureBackupLocations() {
    navigate("/config/backup/locations");
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
