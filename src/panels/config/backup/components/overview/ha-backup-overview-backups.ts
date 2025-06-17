import { mdiCalendarSync, mdiGestureTap, mdiPuzzle } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import type { BackupContent, BackupType } from "../../../../../data/backup";
import {
  computeBackupSize,
  computeBackupType,
  getBackupTypes,
} from "../../../../../data/backup";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { bytesToString } from "../../../../../util/bytes-to-string";

interface BackupStats {
  count: number;
  size: number;
}

const TYPE_ICONS: Record<BackupType, string> = {
  automatic: mdiCalendarSync,
  manual: mdiGestureTap,
  addon_update: mdiPuzzle,
};

const computeBackupStats = (backups: BackupContent[]): BackupStats =>
  backups.reduce(
    (stats, backup) => {
      stats.count++;
      stats.size += computeBackupSize(backup);
      return stats;
    },
    { count: 0, size: 0 }
  );

@customElement("ha-backup-overview-backups")
class HaBackupOverviewBackups extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public backups: BackupContent[] = [];

  private _stats = memoizeOne(
    (
      backups: BackupContent[],
      isHassio: boolean
    ): [BackupType, BackupStats][] =>
      getBackupTypes(isHassio).map((type) => {
        const backupsOfType = backups.filter(
          (backup) => computeBackupType(backup, isHassio) === type
        );
        return [type, computeBackupStats(backupsOfType)] as const;
      })
  );

  render() {
    const isHassio = isComponentLoaded(this.hass, "hassio");
    const stats = this._stats(this.backups, isHassio);

    return html`
      <ha-card class="my-backups">
        <div class="card-header">
          ${this.hass.localize("ui.panel.config.backup.overview.backups.title")}
        </div>
        <div class="card-content">
          <ha-md-list>
            ${stats.map(
              ([type, { count, size }]) => html`
                <ha-md-list-item
                  type="link"
                  href="/config/backup/backups?type=${type}"
                >
                  <ha-svg-icon
                    slot="start"
                    .path=${TYPE_ICONS[type]}
                  ></ha-svg-icon>
                  <div slot="headline">
                    ${this.hass.localize(
                      `ui.panel.config.backup.overview.backups.${type}`,
                      { count }
                    )}
                  </div>
                  <div slot="supporting-text">
                    ${this.hass.localize(
                      "ui.panel.config.backup.overview.backups.total_size",
                      { size: bytesToString(size) }
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>
              `
            )}
          </ha-md-list>
        </div>
        <div class="card-actions">
          <a href="/config/backup/backups?type=all">
            <ha-button appearance="filled">
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
          margin-bottom: calc(72px + var(--safe-area-inset-bottom));
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
