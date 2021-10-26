import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-card";
import "../../../src/components/ha-settings-row";
import {
  extractApiErrorMessage,
  fetchHassioStats,
  HassioStats,
} from "../../../src/data/hassio/common";
import { restartCore, updateCore } from "../../../src/data/supervisor/core";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { bytesToString } from "../../../src/util/bytes-to-string";
import "../components/supervisor-metric";
import { showDialogSupervisorUpdate } from "../dialogs/update/show-dialog-update";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-core-info")
class HassioCoreInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @state() private _metrics?: HassioStats;

  protected render(): TemplateResult | void {
    const metrics = [
      {
        description: this.supervisor.localize("system.core.cpu_usage"),
        value: this._metrics?.cpu_percent,
      },
      {
        description: this.supervisor.localize("system.core.ram_usage"),
        value: this._metrics?.memory_percent,
        tooltip: `${bytesToString(this._metrics?.memory_usage)}/${bytesToString(
          this._metrics?.memory_limit
        )}`,
      },
    ];

    return html`
      <ha-card header="Core">
        <div class="card-content">
          <div>
            <ha-settings-row>
              <span slot="heading">
                ${this.supervisor.localize("common.version")}
              </span>
              <span slot="description">
                core-${this.supervisor.core.version}
              </span>
            </ha-settings-row>
            <ha-settings-row>
              <span slot="heading">
                ${this.supervisor.localize("common.newest_version")}
              </span>
              <span slot="description">
                core-${this.supervisor.core.version_latest}
              </span>
              ${this.supervisor.core.update_available
                ? html`
                    <ha-progress-button
                      .title=${this.supervisor.localize("common.update")}
                      @click=${this._coreUpdate}
                    >
                      ${this.supervisor.localize("common.update")}
                    </ha-progress-button>
                  `
                : ""}
            </ha-settings-row>
          </div>
          <div>
            ${metrics.map(
              (metric) =>
                html`
                  <supervisor-metric
                    .description=${metric.description}
                    .value=${metric.value ?? 0}
                    .tooltip=${metric.tooltip}
                  ></supervisor-metric>
                `
            )}
          </div>
        </div>
        <div class="card-actions">
          <ha-progress-button
            slot="primaryAction"
            class="warning"
            @click=${this._coreRestart}
            .title=${this.supervisor.localize(
              "common.restart_name",
              "name",
              "Core"
            )}
          >
            ${this.supervisor.localize("common.restart_name", "name", "Core")}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(): void {
    this._loadData();
  }

  private async _loadData(): Promise<void> {
    this._metrics = await fetchHassioStats(this.hass, "core");
  }

  private async _coreRestart(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: this.supervisor.localize(
        "confirm.restart.title",
        "name",
        "Home Assistant Core"
      ),
      text: this.supervisor.localize(
        "confirm.restart.text",
        "name",
        "Home Assistant Core"
      ),
      confirmText: this.supervisor.localize("common.restart"),
      dismissText: this.supervisor.localize("common.cancel"),
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await restartCore(this.hass);
    } catch (err: any) {
      if (this.hass.connection.connected) {
        showAlertDialog(this, {
          title: this.supervisor.localize(
            "common.failed_to_restart_name",
            "name",
            "Home AssistantCore"
          ),
          text: extractApiErrorMessage(err),
        });
      }
    } finally {
      button.progress = false;
    }
  }

  private async _coreUpdate(): Promise<void> {
    showDialogSupervisorUpdate(this, {
      supervisor: this.supervisor,
      name: "Home Assistant Core",
      version: this.supervisor.core.version_latest,
      backupParams: {
        name: `core_${this.supervisor.core.version}`,
        folders: ["homeassistant"],
        homeassistant: true,
      },
      updateHandler: async () => this._updateCore(),
    });
  }

  private async _updateCore(): Promise<void> {
    await updateCore(this.hass);
    fireEvent(this, "supervisor-collection-refresh", {
      collection: "core",
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      hassioStyle,
      css`
        ha-card {
          height: 100%;
          justify-content: space-between;
          flex-direction: column;
          display: flex;
        }
        .card-actions {
          height: 48px;
          border-top: none;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        .card-content {
          display: flex;
          flex-direction: column;
          height: calc(100% - 124px);
          justify-content: space-between;
        }
        ha-settings-row {
          padding: 0;
          height: 54px;
          width: 100%;
        }
        ha-settings-row[three-line] {
          height: 74px;
        }
        ha-settings-row > span[slot="description"] {
          white-space: normal;
          color: var(--secondary-text-color);
        }

        .warning {
          --mdc-theme-primary: var(--error-color);
        }

        ha-button-menu {
          color: var(--secondary-text-color);
          --mdc-menu-min-width: 200px;
        }
        @media (min-width: 563px) {
          paper-listbox {
            max-height: 150px;
            overflow: auto;
          }
        }
        paper-item {
          cursor: pointer;
          min-height: 35px;
        }
        mwc-list-item ha-svg-icon {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-core-info": HassioCoreInfo;
  }
}
