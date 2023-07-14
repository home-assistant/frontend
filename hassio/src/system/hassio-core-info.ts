import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { atLeastVersion } from "../../../src/common/config/version";
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
      <ha-card header="Core" outlined>
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
              ${!atLeastVersion(this.hass.config.version, 2021, 12) &&
              this.supervisor.core.update_available
                ? html`
                    <a href="/hassio/update-available/core">
                      <mwc-button
                        .label=${this.supervisor.localize("common.show")}
                      >
                      </mwc-button>
                    </a>
                  `
                : ""}
            </ha-settings-row>
          </div>
          <div>
            ${metrics.map(
              (metric) => html`
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
        mwc-list-item ha-svg-icon {
          color: var(--secondary-text-color);
        }
        a {
          text-decoration: none;
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
