import { mdiPuzzle } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import {
  getSupervisorUpdateConfig,
  type SupervisorUpdateConfig,
} from "../../../../../data/supervisor/update";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-backup-overview-app-update-backup")
class HaBackupOverviewAppUpdateBackup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _supervisorUpdateConfig?: SupervisorUpdateConfig;

  protected firstUpdated() {
    this._fetchSupervisorUpdateConfig();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._fetchSupervisorUpdateConfig();
    }
  }

  private async _fetchSupervisorUpdateConfig() {
    try {
      this._supervisorUpdateConfig = await getSupervisorUpdateConfig(this.hass);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  private _appUpdateBackupDescription() {
    if (!this._supervisorUpdateConfig) {
      return this.hass.localize(
        "ui.panel.config.backup.settings.app_update_backup.local_only"
      );
    }

    if (!this._supervisorUpdateConfig.add_on_backup_before_update) {
      return this.hass.localize(
        "ui.panel.config.backup.schedule.update_preference.skip_backups"
      );
    }

    const copies =
      this._supervisorUpdateConfig.add_on_backup_retain_copies || 1;

    return `${this.hass.localize(
      "ui.panel.config.backup.schedule.update_preference.backup_before_update"
    )} ${this.hass.localize(
      "ui.panel.config.backup.overview.settings.schedule_copies_backups",
      { count: copies }
    )}`;
  }

  protected render() {
    return html`
      <ha-card>
        <div class="card-header">
          ${this.hass.localize(
            "ui.panel.config.backup.overview.app_update_backup.title"
          )}
        </div>
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item
              type="link"
              href="/config/backup/app-update-backups"
            >
              <ha-svg-icon slot="start" .path=${mdiPuzzle}></ha-svg-icon>
              <div slot="headline">${this._appUpdateBackupDescription()}</div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.app_update_backup.description"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .card-header {
          padding-bottom: 8px;
        }

        .card-content {
          padding-left: 0;
          padding-right: 0;
          padding-top: 0;
        }

        ha-md-list {
          padding-top: 0;
          padding-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-overview-app-update-backup": HaBackupOverviewAppUpdateBackup;
  }
}
