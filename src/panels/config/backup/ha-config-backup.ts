import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type {
  BackupAgent,
  BackupConfig,
  BackupInfo,
} from "../../../data/backup";
import {
  compareAgents,
  fetchBackupAgentsInfo,
  fetchBackupConfig,
  fetchBackupInfo,
} from "../../../data/backup";
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

declare global {
  interface HASSDomEvents {
    "ha-refresh-backup-info": undefined;
    "ha-refresh-backup-config": undefined;
  }
}

@customElement("ha-config-backup")
class HaConfigBackup extends SubscribeMixin(HassRouterPage) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @property({ type: Boolean }) public narrow = false;

  @state() private _manager: ManagerStateEvent = DEFAULT_MANAGER_STATE;

  @state() private _info?: BackupInfo;

  @state() private _agents: BackupAgent[] = [];

  @state() private _fetching = false;

  @state() private _config?: BackupConfig;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetchAll();
    this.addEventListener("ha-refresh-backup-info", () => {
      this._fetchBackupInfo();
    });
    this.addEventListener("ha-refresh-backup-config", () => {
      this._fetchBackupConfig();
    });
    this.addEventListener("ha-refresh-backup-agents", () => {
      this._fetchBackupAgents();
    });
  }

  private _fetchAll() {
    this._fetching = true;
    Promise.all([
      this._fetchBackupInfo(),
      this._fetchBackupConfig(),
      this._fetchBackupAgents(),
    ]).finally(() => {
      this._fetching = false;
    });
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._fetchBackupInfo();
      this._fetchBackupConfig();
      this._fetchBackupAgents();
    }
  }

  private async _fetchBackupInfo() {
    this._info = await fetchBackupInfo(this.hass);
  }

  private async _fetchBackupConfig() {
    const { config } = await fetchBackupConfig(this.hass);
    this._config = config;
  }

  private async _fetchBackupAgents() {
    const { agents } = await fetchBackupAgentsInfo(this.hass);
    this._agents = agents.sort((a, b) => compareAgents(a.agent_id, b.agent_id));
  }

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
      settings: {
        tag: "ha-config-backup-settings",
        load: () => import("./ha-config-backup-settings"),
        cache: true,
      },
      location: {
        tag: "ha-config-backup-location",
        load: () => import("./ha-config-backup-location"),
      },
    },
  };

  protected updatePageEl(pageEl, changedProps: PropertyValues) {
    pageEl.hass = this.hass;
    pageEl.route = this.routeTail;
    pageEl.narrow = this.narrow;
    pageEl.cloudStatus = this.cloudStatus;
    pageEl.manager = this._manager;
    pageEl.info = this._info;
    pageEl.backups = this._info?.backups || [];
    pageEl.config = this._config;
    pageEl.agents = this._agents;
    pageEl.fetching = this._fetching;

    if (!changedProps || changedProps.has("route")) {
      switch (this._currentPage) {
        case "details":
          pageEl.backupId = this.routeTail.path.substr(1);
          break;
        case "location":
          pageEl.agentId = this.routeTail.path.substr(1);
          break;
      }
    }
  }

  public hassSubscribe(): Promise<UnsubscribeFunc>[] {
    return [
      subscribeBackupEvents(this.hass!, (event) => {
        const curState = this._manager.manager_state;

        this._manager = event;
        if (
          event.manager_state === "idle" &&
          event.manager_state !== curState
        ) {
          this._fetchAll();
        }
        if ("state" in event) {
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
