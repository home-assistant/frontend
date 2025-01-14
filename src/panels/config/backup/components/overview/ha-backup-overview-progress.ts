import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { ManagerStateEvent } from "../../../../../data/backup_manager";
import type { HomeAssistant } from "../../../../../types";
import "../ha-backup-summary-card";

@customElement("ha-backup-overview-progress")
export class HaBackupOverviewProgress extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public manager!: ManagerStateEvent;

  private get _heading() {
    const state = this.manager.manager_state;
    if (state === "idle") {
      return "";
    }
    return this.hass.localize(
      `ui.panel.config.backup.overview.progress.heading.${state}`
    );
  }

  private get _description() {
    switch (this.manager.manager_state) {
      case "create_backup":
        if (!this.manager.stage) {
          return "";
        }
        return this.hass.localize(
          `ui.panel.config.backup.overview.progress.description.create_backup.${this.manager.stage}`
        );
      case "restore_backup":
        if (!this.manager.stage) {
          return "";
        }
        return this.hass.localize(
          `ui.panel.config.backup.overview.progress.description.restore_backup.${this.manager.stage}`
        );

      case "receive_backup":
        if (!this.manager.stage) {
          return "";
        }
        return this.hass.localize(
          `ui.panel.config.backup.overview.progress.description.receive_backup.${this.manager.stage}`
        );
      default:
        return "";
    }
  }

  protected render() {
    return html`
      <ha-backup-summary-card
        .hass=${this.hass}
        .heading=${this._heading}
        .description=${this._description}
        status="loading"
      >
      </ha-backup-summary-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-overview-progress": HaBackupOverviewProgress;
  }
}
