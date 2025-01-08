import { mdiCalendarSync, mdiGestureTap } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import type { BackupContent } from "../../../../../data/backup";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { bytesToString } from "../../../../../util/bytes-to-string";

type BackupStats = {
  count: number;
  size: number;
};

const computeBackupStats = (backups: BackupContent[]): BackupStats =>
  backups.reduce(
    (stats, backup) => {
      stats.count++;
      stats.size += backup.size;
      return stats;
    },
    { count: 0, size: 0 }
  );

@customElement("ha-backup-overview-backups")
class HaBackupOverviewBackups extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public backups: BackupContent[] = [];

  private _automaticStats = memoizeOne((backups: BackupContent[]) => {
    const automaticBackups = backups.filter(
      (backup) => backup.with_automatic_settings
    );
    return computeBackupStats(automaticBackups);
  });

  private _manualStats = memoizeOne((backups: BackupContent[]) => {
    const manualBackups = backups.filter(
      (backup) => !backup.with_automatic_settings
    );
    return computeBackupStats(manualBackups);
  });

  render() {
    const automaticStats = this._automaticStats(this.backups);
    const manualStats = this._manualStats(this.backups);

    return html`
      <ha-card class="my-backups">
        <div class="card-header">
          ${this.hass.localize("ui.panel.config.backup.overview.backups.title")}
        </div>
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item
              type="link"
              href="/config/backup/backups?type=automatic"
            >
              <ha-svg-icon slot="start" .path=${mdiCalendarSync}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.backups.automatic",
                  { count: automaticStats.count }
                )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.backups.total_size",
                  { size: bytesToString(automaticStats.size, 1) }
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item
              type="link"
              href="/config/backup/backups?type=manual"
            >
              <ha-svg-icon slot="start" .path=${mdiGestureTap}></ha-svg-icon>
              <div slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.backups.automatic",
                  { count: manualStats.count }
                )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.backups.total_size",
                  { size: bytesToString(manualStats.size, 1) }
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
          </ha-md-list>
        </div>
        <div class="card-actions">
          <a href="/config/backup/backups?type=all">
            <ha-button>
              ${this.hass.localize(
                "ui.panel.config.backup.overview.backups.show_all"
              )}
            </ha-button>
          </a>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 28px 20px 0;
          max-width: 690px;
          margin: 0 auto;
          gap: 24px;
          display: flex;
          flex-direction: column;
          margin-bottom: calc(72px + env(safe-area-inset-bottom));
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
        .card-header {
          padding-bottom: 8px;
        }
        .card-content {
          padding-left: 0;
          padding-right: 0;
          padding-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-overview-backups": HaBackupOverviewBackups;
  }
}
