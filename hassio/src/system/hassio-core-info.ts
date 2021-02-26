import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-card";
import "../../../src/components/ha-settings-row";
import {
  extractApiErrorMessage,
  fetchHassioStats,
  HassioStats,
} from "../../../src/data/hassio/common";
import { restartCore } from "../../../src/data/supervisor/core";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { bytesToString } from "../../../src/util/bytes-to-string";
import "../components/supervisor-metric";
import { showDialogSupervisorCoreUpdate } from "../dialogs/core/show-dialog-core-update";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-core-info")
class HassioCoreInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @internalProperty() private _metrics?: HassioStats;

  protected render(): TemplateResult | void {
    const metrics = [
      {
        description: "Core CPU Usage",
        value: this._metrics?.cpu_percent,
      },
      {
        description: "Core RAM Usage",
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
                Version
              </span>
              <span slot="description">
                core-${this.supervisor.core.version}
              </span>
            </ha-settings-row>
            <ha-settings-row>
              <span slot="heading">
                Newest Version
              </span>
              <span slot="description">
                core-${this.supervisor.core.version_latest}
              </span>
              ${this.supervisor.core.update_available
                ? html`
                    <ha-progress-button
                      title="Update the core"
                      @click=${this._coreUpdate}
                    >
                      Update
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
            title="Restart Home Assistant Core"
          >
            Restart Core
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
      title: "Restart Home Assistant Core",
      text: "Are you sure you want to restart Home Assistant Core",
      confirmText: "restart",
      dismissText: "cancel",
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await restartCore(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to restart Home Assistant Core",
        text: extractApiErrorMessage(err),
      });
    } finally {
      button.progress = false;
    }
  }

  private async _coreUpdate(): Promise<void> {
    showDialogSupervisorCoreUpdate(this, { core: this.supervisor.core });
  }

  static get styles(): CSSResult[] {
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
