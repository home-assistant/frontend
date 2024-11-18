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
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-svg-icon";
import {
  fetchBackupAgentsBackups,
  fetchBackupInfo,
  generateBackup,
  type BackupContent,
} from "../../../data/backup";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../lovelace/custom-card-helpers";
import "./components/ha-backup-summary-card";

@customElement("ha-config-backup-dashboard")
class HaConfigBackupDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _backingUp = false;

  @state() private _backups: BackupContent[] = [];

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
          html`${(backup.agents || []).map((agent) => {
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
    this._fetchBackups();
    this._fetchStatus();
  }

  private async _fetchStatus() {
    const info = await fetchBackupInfo(this.hass);
    this._backingUp = info.backing_up;
  }

  private async _fetchBackups(): Promise<void> {
    const backupData: Record<string, BackupContent> = {};

    const agentsBackups = await fetchBackupAgentsBackups(this.hass);

    for (const agent of agentsBackups) {
      if (!(agent.slug in backupData)) {
        backupData[agent.slug] = { ...agent, agents: [agent.agent_id] };
      } else if (!("agents" in backupData[agent.slug])) {
        backupData[agent.slug].agents = [agent.agent_id];
      } else {
        backupData[agent.slug].agents!.push(agent.agent_id);
      }
    }
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

    // Todo subscribe for status updates
    try {
      await generateBackup(this.hass, { agent_ids: ["backup.local"] });
    } catch (err) {
      showAlertDialog(this, { text: (err as Error).message });
    }

    await this._fetchStatus();

    const interval = setInterval(async () => {
      await this._fetchStatus();
      if (!this._backingUp) {
        clearInterval(interval);
        this._fetchBackups();
      }
    }, 2000);
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-dashboard": HaConfigBackupDashboard;
  }
}
