import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDateTime } from "../../../../common/datetime/format_date_time";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import "../../../../components/ha-alert";
import "../../../../components/ha-card";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import {
  computeBackupAgentName,
  computeBackupSize,
  computeBackupType,
  fetchBackupAgentsInfo,
  type BackupAgent,
  type BackupContentExtended,
} from "../../../../data/backup";
import type { HomeAssistant } from "../../../../types";
import { bytesToString } from "../../../../util/bytes-to-string";

@customElement("ha-backup-details-summary")
class HaBackupDetailsSummary extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Object }) public backup!: BackupContentExtended;

  @property({ type: Boolean, attribute: "hassio" }) public isHassio = false;

  @state() private _agents: BackupAgent[] = [];

  protected willUpdate() {
    // load agent information if needed for errors
    if (!this.updated && this.backup.failed_agent_ids?.length) {
      this._fetchBackupAgents();
    }
  }

  render() {
    const backupDate = new Date(this.backup.date);
    const formattedDate = formatDateTime(
      backupDate,
      this.hass.locale,
      this.hass.config
    );

    return html`
      <ha-card>
        <div class="card-header">
          ${this.hass.localize("ui.panel.config.backup.details.summary.title")}
        </div>
        <div class="card-content">
          ${this.backup.failed_agent_ids?.length ||
          this.backup.failed_addons?.length ||
          this.backup.failed_folders?.length
            ? this._renderErrorSummary()
            : nothing}
          <ha-md-list class="summary">
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize("ui.panel.config.backup.backup_type")}
              </span>
              <span slot="supporting-text">
                ${this.hass.localize(
                  `ui.panel.config.backup.type.${computeBackupType(this.backup, this.isHassio)}`
                )}
              </span>
            </ha-md-list-item>
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.details.summary.size"
                )}
              </span>
              <span slot="supporting-text">
                ${bytesToString(computeBackupSize(this.backup))}
              </span>
            </ha-md-list-item>
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.details.summary.created"
                )}
              </span>
              <span slot="supporting-text">${formattedDate}</span>
            </ha-md-list-item>
          </ha-md-list>
        </div>
      </ha-card>
    `;
  }

  private _renderErrorSummary() {
    return html`
      <ha-alert alert-type="error">
        ${this.hass.localize(
          "ui.panel.config.backup.details.summary.error.title"
        )}
        <br />
        ${this.backup.failed_agent_ids?.length
          ? html`
              <br />
              ${this.hass.localize(
                "ui.panel.config.backup.details.summary.error.failed_locations"
              )}:
              <ul>
                ${this.backup.failed_agent_ids.map(
                  (agentId) =>
                    html`<li>
                      ${computeBackupAgentName(
                        this.hass.localize,
                        agentId,
                        this._agents
                      )}
                    </li>`
                )}
              </ul>
            `
          : nothing}
        ${this.backup.failed_addons?.length
          ? html`
              <br />
              ${this.hass.localize(
                "ui.panel.config.backup.details.summary.error.failed_addons"
              )}:
              <ul>
                ${this.backup.failed_addons.map(
                  (addon) =>
                    html`<li>
                      ${addon.name || addon.slug} (${addon.version})
                    </li>`
                )}
              </ul>
            `
          : nothing}
        ${this.backup.failed_folders?.length
          ? html`
              <br />
              ${this.hass.localize(
                "ui.panel.config.backup.details.summary.error.failed_folders"
              )}:
              <ul>
                ${this.backup.failed_folders.map(
                  (folder) => html`<li>${this._localizeFolder(folder)}</li>`
                )}
              </ul>
            `
          : nothing}
      </ha-alert>
    `;
  }

  private async _fetchBackupAgents() {
    const { agents } = await fetchBackupAgentsInfo(this.hass);
    this._agents = agents;
  }

  private _localizeFolder(folder: string): string {
    switch (folder) {
      case "media":
        return this.hass.localize(`ui.panel.config.backup.data_picker.media`);
      case "share":
        return this.hass.localize(
          `ui.panel.config.backup.data_picker.share_folder`
        );
      case "ssl":
        return this.hass.localize(`ui.panel.config.backup.data_picker.ssl`);
      case "addons/local":
        return this.hass.localize(
          `ui.panel.config.backup.data_picker.local_addons`
        );
    }
    return capitalizeFirstLetter(folder);
  }

  static styles = css`
    :host {
      max-width: 690px;
      width: 100%;
      margin: 0 auto;
      gap: 24px;
      display: grid;
    }
    .card-content {
      padding: 0 20px;
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
    }
    ha-md-list {
      background: none;
      padding: 0;
    }
    ha-md-list-item {
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
      --md-list-item-two-line-container-height: 64px;
    }
    ha-md-list.summary ha-md-list-item {
      --md-list-item-supporting-text-size: 1rem;
      --md-list-item-label-text-size: 0.875rem;

      --md-list-item-label-text-color: var(--secondary-text-color);
      --md-list-item-supporting-text-color: var(--primary-text-color);
    }
    ha-md-list-item [slot="supporting-text"] {
      display: flex;
      align-items: center;
      flex-direction: row;
      gap: 8px;
      line-height: var(--ha-line-height-condensed);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-details-summary": HaBackupDetailsSummary;
  }
}
