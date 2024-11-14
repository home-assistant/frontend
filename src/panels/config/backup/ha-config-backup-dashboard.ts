import { mdiPlus } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import { navigate } from "../../../common/navigate";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-summary-card";
import "../../../components/ha-svg-icon";
import {
  fetchBackupAgentsSynced,
  fetchBackupInfo,
  generateBackup,
  type BackupContent,
  type BackupData,
} from "../../../data/backup";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../lovelace/custom-card-helpers";

const localAgent = "backup.local";

@customElement("ha-config-backup-dashboard")
class HaConfigBackupDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _backupData?: BackupData;

  private _columns = memoizeOne(
    (
      narrow,
      _language,
      localize: LocalizeFunc
    ): DataTableColumnContainer<BackupContent> => ({
      name: {
        title: localize("ui.panel.config.backup.name"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 2,
        template: (backup) =>
          narrow || !backup.path
            ? backup.name
            : html`${backup.name}
                <div class="secondary">${backup.path}</div>`,
      },
      path: {
        title: localize("ui.panel.config.backup.path"),
        hidden: !narrow,
        template: (backup) => backup.path || "-",
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
          html` ${[
            ...(backup.path ? [localAgent] : []),
            ...(backup.agents || []).sort(),
          ].map((agent) => {
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
    })
  );

  protected render(): TemplateResult {
    const backingUp = this._backupData?.backing_up;

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
        id="slug"
        .route=${this.route}
        @row-click=${this._showBackupDetails}
        .columns=${this._columns(
          this.narrow,
          this.hass.language,
          this.hass.localize
        )}
        .data=${this._backupData?.backups ?? []}
        .noDataText=${this.hass.localize("ui.panel.config.backup.no_backups")}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.backup.picker.search"
        )}
      >
        <div slot="top_header" class="header">
          <ha-summary-card
            title="Automatically backed up"
            description="Your configuration has been backed up."
            has-action
            .status=${backingUp ? "loading" : "success"}
          >
            <ha-button slot="action" @click=${this._configureAutomaticBackup}>
              Configure
            </ha-button>
          </ha-summary-card>
          <ha-summary-card
            title="3 automatic backup locations"
            description="One is off-site"
            has-action
            .status=${"success"}
          >
            <ha-button slot="action" @click=${this._configureBackupLocations}>
              Configure
            </ha-button>
          </ha-summary-card>
        </div>
        <ha-fab
          slot="fab"
          ?disabled=${backingUp}
          .label=${backingUp
            ? this.hass.localize("ui.panel.config.backup.creating_backup")
            : this.hass.localize("ui.panel.config.backup.create_backup")}
          extended
          @click=${this._generateBackup}
        >
          ${backingUp
            ? html`
                <div slot="icon">
                  <ha-circular-progress indeterminate></ha-circular-progress>
                </div>
              `
            : html`<ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>`}
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetchBackups();
  }

  private async _fetchBackups(): Promise<void> {
    const backupData: Record<string, BackupContent> = {};
    const [local, synced] = await Promise.all([
      fetchBackupInfo(this.hass),
      fetchBackupAgentsSynced(this.hass),
    ]);

    for (const backup of local.backups) {
      backupData[backup.slug] = backup;
    }
    for (const agent of synced) {
      if (!(agent.slug in backupData)) {
        backupData[agent.slug] = { ...agent, agents: [agent.agent_id] };
      } else if (!("agents" in backupData[agent.slug])) {
        backupData[agent.slug].agents = [agent.agent_id];
      } else {
        backupData[agent.slug].agents!.push(agent.agent_id);
      }
    }
    this._backupData = {
      backing_up: local.backing_up,
      backups: Object.values(backupData),
    };
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

    generateBackup(this.hass)
      .then(() => this._fetchBackups())
      .catch((err) => showAlertDialog(this, { text: (err as Error).message }));

    await this._fetchBackups();
  }

  private _showBackupDetails(ev: CustomEvent): void {
    const slug = (ev.detail as RowClickedEvent).id;
    navigate(`/config/backup/details/${slug}`);
  }

  private _configureAutomaticBackup() {
    navigate("/config/backup/automatic-config");
  }

  private _configureBackupLocations() {
    navigate("/config/backup/locations");
  }

  static styles = css`
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
    ha-circular-progress {
      --md-sys-color-primary: var(--secondary-text-color);
      --md-circular-progress-size: 36px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-dashboard": HaConfigBackupDashboard;
  }
}
