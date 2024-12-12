import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { ManagerStateEvent } from "../../../../data/backup_manager";
import type { HomeAssistant } from "../../../../types";
import "./ha-backup-summary-card";

@customElement("ha-backup-summary-progress")
export class HaBackupSummaryProgress extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public manager!: ManagerStateEvent;

  @property({ type: Boolean, attribute: "has-action" })
  public hasAction = false;

  private get _heading() {
    switch (this.manager.manager_state) {
      case "create_backup":
        return "Creating backup";
      case "restore_backup":
        return "Restoring backup";
      case "receive_backup":
        return "Receiving backup";
      default:
        return "";
    }
  }

  private get _description() {
    switch (this.manager.manager_state) {
      case "create_backup":
        switch (this.manager.stage) {
          case "addon_repositories":
          case "addons":
            return "Backing up add-ons";
          case "await_addon_restarts":
            return "Waiting for add-ons to restart";
          case "docker_config":
            return "Backing up Docker configuration";
          case "finishing_file":
            return "Finishing backup file";
          case "folders":
            return "Backing up folders";
          case "home_assistant":
            return "Backing up Home Assistant";
          case "upload_to_agents":
            return "Uploading to locations";
          default:
            return "";
        }
      case "restore_backup":
        switch (this.manager.stage) {
          case "addon_repositories":
          case "addons":
            return "Restoring add-ons";
          case "await_addon_restarts":
            return "Waiting for add-ons to restart";
          case "await_home_assistant_restart":
            return "Waiting for Home Assistant to restart";
          case "check_home_assistant":
            return "Checking Home Assistant";
          case "docker_config":
            return "Restoring Docker configuration";
          case "download_from_agent":
            return "Downloading from location";
          case "folders":
            return "Restoring folders";
          case "home_assistant":
            return "Restoring Home Assistant";
          case "remove_delta_addons":
            return "Removing delta add-ons";
          default:
            return "";
        }
      case "receive_backup":
        switch (this.manager.stage) {
          case "receive_file":
            return "Receiving file";
          case "upload_to_agents":
            return "Uploading to locations";
          default:
            return "";
        }
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
        .hasAction=${this.hasAction}
      >
        <slot name="action" slot="action"></slot>
      </ha-backup-summary-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-summary-progress": HaBackupSummaryProgress;
  }
}
