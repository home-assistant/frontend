import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { ManagerStateEvent } from "../../../data/backup_manager";
import {
  DEFAULT_MANAGER_STATE,
  subscribeBackupEvents,
} from "../../../data/backup_manager";
import type { CloudStatus } from "../../../data/cloud";
import type { RouterOptions } from "../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../layouts/hass-router-page";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import "./ha-config-backup-backups";
import "./ha-config-backup-overview";

@customElement("ha-config-backup")
class HaConfigBackup extends SubscribeMixin(HassRouterPage) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus!: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @state() private _manager: ManagerStateEvent = DEFAULT_MANAGER_STATE;

  protected routerOptions: RouterOptions = {
    defaultPage: "overview",
    routes: {
      overview: {
        tag: "ha-config-backup-overview",
        cache: true,
      },
      backups: {
        tag: "ha-config-backup-backups",
        cache: true,
      },
      details: {
        tag: "ha-config-backup-details",
        load: () => import("./ha-config-backup-details"),
      },
      locations: {
        tag: "ha-config-backup-locations",
        load: () => import("./ha-config-backup-locations"),
      },
      settings: {
        tag: "ha-config-backup-settings",
        load: () => import("./ha-config-backup-settings"),
      },
    },
  };

  protected updatePageEl(pageEl, changedProps: PropertyValues) {
    pageEl.hass = this.hass;
    pageEl.route = this.routeTail;
    pageEl.narrow = this.narrow;
    pageEl.cloudStatus = this.cloudStatus;
    pageEl.manager = this._manager;

    if (
      (!changedProps || changedProps.has("route")) &&
      this._currentPage === "details"
    ) {
      pageEl.backupId = this.routeTail.path.substr(1);
    }
  }

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    return [
      subscribeBackupEvents(this.hass!, (event) => {
        this._manager = event;
        if ("state" in event) {
          if (event.state === "completed" || event.state === "failed") {
            // this._fetchBackupInfo();
          }
          if (event.state === "failed") {
            let message = "";
            switch (this._manager.manager_state) {
              case "create_backup":
                message = "Failed to create backup";
                break;
              case "restore_backup":
                message = "Failed to restore backup";
                break;
              case "receive_backup":
                message = "Failed to upload backup";
                break;
            }
            if (message) {
              showToast(this, { message });
            }
          }
        }
      }),
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-backup": HaConfigBackup;
  }
}
