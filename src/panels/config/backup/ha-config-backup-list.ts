import { mdiPlus } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoize from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-circular-progress";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-svg-icon";
import {
  BackupContent,
  BackupData,
  fetchBackupAgentsSynced,
  fetchBackupInfo,
  generateBackup,
} from "../../../data/backup";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../types";
import { LocalizeFunc } from "../../../common/translations/localize";
import { brandsUrl } from "../../../util/brands-url";

const localAgent = "backup.local";

@customElement("ha-config-backup-list")
class HaConfigBackup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _backupData?: BackupData;

  private _columns = memoize(
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
          html`${[
            ...(backup.path ? [localAgent] : []),
            ...(backup.agents || []).sort(),
          ].map((agent) => {
            const [domain, name] = agent.split(".");
            return html`<img
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
            />`;
          })}`,
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
      agents: backup.agents,
    }))
  );

  protected render(): TemplateResult {
    if (!this.hass || this._backupData === undefined) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

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
        back-path="/config/backup/dashboard"
        clickable
        .route=${this.route}
        .columns=${this._columns(
          this.narrow,
          this.hass.language,
          this.hass.localize
        )}
        .data=${this._getItems(this._backupData.backups)}
        .noDataText=${this.hass.localize("ui.panel.config.backup.no_backups")}
        .searchLabel=${this.hass.localize(
          "ui.panel.config.backup.picker.search"
        )}
      >
        <ha-fab
          slot="fab"
          ?disabled=${this._backupData.backing_up}
          .label=${this._backupData.backing_up
            ? this.hass.localize("ui.panel.config.backup.creating_backup")
            : this.hass.localize("ui.panel.config.backup.create_backup")}
          extended
          @click=${this._generateBackup}
        >
          ${this._backupData.backing_up
            ? html`<ha-circular-progress
                slot="icon"
                indeterminate
              ></ha-circular-progress>`
            : html`<ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>`}
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._getBackups();
  }

  private async _getBackups(): Promise<void> {
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
      .then(() => this._getBackups())
      .catch((err) => showAlertDialog(this, { text: (err as Error).message }));

    await this._getBackups();
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-fab[disabled] {
          --mdc-theme-secondary: var(--disabled-text-color) !important;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup-list": HaConfigBackup;
  }
}
