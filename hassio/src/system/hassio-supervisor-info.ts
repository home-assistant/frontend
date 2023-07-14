import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { atLeastVersion } from "../../../src/common/config/version";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-alert";
import "../../../src/components/ha-card";
import "../../../src/components/ha-settings-row";
import "../../../src/components/ha-switch";
import {
  extractApiErrorMessage,
  fetchHassioStats,
  HassioStats,
} from "../../../src/data/hassio/common";
import {
  reloadSupervisor,
  restartSupervisor,
  setSupervisorOption,
  SupervisorOptions,
} from "../../../src/data/hassio/supervisor";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { showJoinBetaDialog } from "../../../src/panels/config/core/updates/show-dialog-join-beta";
import {
  UNHEALTHY_REASON_URL,
  UNSUPPORTED_REASON_URL,
} from "../../../src/panels/config/repairs/dialog-system-information";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { bytesToString } from "../../../src/util/bytes-to-string";
import { documentationUrl } from "../../../src/util/documentation-url";
import "../components/supervisor-metric";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-supervisor-info")
class HassioSupervisorInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @state() private _metrics?: HassioStats;

  protected render(): TemplateResult | void {
    const metrics = [
      {
        description: this.supervisor.localize("system.supervisor.cpu_usage"),
        value: this._metrics?.cpu_percent,
      },
      {
        description: this.supervisor.localize("system.supervisor.ram_usage"),
        value: this._metrics?.memory_percent,
        tooltip: `${bytesToString(this._metrics?.memory_usage)}/${bytesToString(
          this._metrics?.memory_limit
        )}`,
      },
    ];
    return html`
      <ha-card header="Supervisor" outlined>
        <div class="card-content">
          <div>
            <ha-settings-row>
              <span slot="heading">
                ${this.supervisor.localize("common.version")}
              </span>
              <span slot="description">
                supervisor-${this.supervisor.supervisor.version}
              </span>
            </ha-settings-row>
            <ha-settings-row>
              <span slot="heading">
                ${this.supervisor.localize("common.newest_version")}
              </span>
              <span slot="description">
                supervisor-${this.supervisor.supervisor.version_latest}
              </span>
              ${!atLeastVersion(this.hass.config.version, 2021, 12) &&
              this.supervisor.supervisor.update_available
                ? html`
                    <a href="/hassio/update-available/supervisor">
                      <mwc-button
                        .label=${this.supervisor.localize("common.show")}
                      >
                      </mwc-button>
                    </a>
                  `
                : ""}
            </ha-settings-row>
            <ha-settings-row>
              <span slot="heading">
                ${this.supervisor.localize("system.supervisor.channel")}
              </span>
              <span slot="description">
                ${this.supervisor.supervisor.channel}
              </span>
              ${this.supervisor.supervisor.channel === "beta"
                ? html`
                    <ha-progress-button
                      @click=${this._toggleBeta}
                      .title=${this.supervisor.localize(
                        "system.supervisor.leave_beta_description"
                      )}
                    >
                      ${this.supervisor.localize(
                        "system.supervisor.leave_beta_action"
                      )}
                    </ha-progress-button>
                  `
                : this.supervisor.supervisor.channel === "stable"
                ? html`
                    <ha-progress-button
                      @click=${this._toggleBeta}
                      .title=${this.supervisor.localize(
                        "system.supervisor.join_beta_description"
                      )}
                    >
                      ${this.supervisor.localize(
                        "system.supervisor.join_beta_action"
                      )}
                    </ha-progress-button>
                  `
                : ""}
            </ha-settings-row>

            ${this.supervisor.supervisor.supported
              ? !atLeastVersion(this.hass.config.version, 2021, 4)
                ? html` <ha-settings-row three-line>
                    <span slot="heading">
                      ${this.supervisor.localize(
                        "system.supervisor.share_diagnostics"
                      )}
                    </span>
                    <div slot="description" class="diagnostics-description">
                      ${this.supervisor.localize(
                        "system.supervisor.share_diagnostics_description"
                      )}
                      <button
                        class="link"
                        .title=${this.supervisor.localize("common.show_more")}
                        @click=${this._diagnosticsInformationDialog}
                      >
                        ${this.supervisor.localize("common.learn_more")}
                      </button>
                    </div>
                    <ha-switch
                      haptic
                      .checked=${this.supervisor.supervisor.diagnostics}
                      @change=${this._toggleDiagnostics}
                    ></ha-switch>
                  </ha-settings-row>`
                : ""
              : html`<ha-alert alert-type="warning">
                  ${this.supervisor.localize(
                    "system.supervisor.unsupported_title"
                  )}
                  <mwc-button
                    slot="action"
                    .label=${this.supervisor.localize("common.learn_more")}
                    @click=${this._unsupportedDialog}
                  >
                  </mwc-button>
                </ha-alert>`}
            ${!this.supervisor.supervisor.healthy
              ? html`<ha-alert alert-type="error">
                  ${this.supervisor.localize(
                    "system.supervisor.unhealthy_title"
                  )}
                  <mwc-button
                    slot="action"
                    .label=${this.supervisor.localize("common.learn_more")}
                    @click=${this._unhealthyDialog}
                  >
                  </mwc-button>
                </ha-alert>`
              : ""}
          </div>
          <div class="metrics-block">
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
            @click=${this._supervisorReload}
            .title=${this.supervisor.localize(
              "system.supervisor.reload_supervisor"
            )}
          >
            ${this.supervisor.localize("system.supervisor.reload_supervisor")}
          </ha-progress-button>
          <ha-progress-button
            class="warning"
            @click=${this._supervisorRestart}
            .title=${this.supervisor.localize(
              "common.restart_name",
              "name",
              "Supervisor"
            )}
          >
            ${this.supervisor.localize(
              "common.restart_name",
              "name",
              "Supervisor"
            )}
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  protected firstUpdated(): void {
    this._loadData();
  }

  private async _loadData(): Promise<void> {
    this._metrics = await fetchHassioStats(this.hass, "supervisor");
  }

  private async _toggleBeta(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    if (this.supervisor.supervisor.channel === "stable") {
      showJoinBetaDialog(this, {
        join: async () => {
          await this._setChannel("beta");
          button.progress = false;
        },
        cancel: () => {
          button.progress = false;
        },
      });
    } else {
      await this._setChannel("stable");
      button.progress = false;
    }
  }

  private async _setChannel(
    channel: SupervisorOptions["channel"]
  ): Promise<void> {
    try {
      const data: Partial<SupervisorOptions> = {
        channel,
      };
      await setSupervisorOption(this.hass, data);
      await this._reloadSupervisor();
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize(
          "system.supervisor.failed_to_set_option"
        ),
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _supervisorReload(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await this._reloadSupervisor();
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize("system.supervisor.failed_to_reload"),
        text: extractApiErrorMessage(err),
      });
    } finally {
      button.progress = false;
    }
  }

  private async _reloadSupervisor(): Promise<void> {
    await reloadSupervisor(this.hass);
    fireEvent(this, "supervisor-collection-refresh", {
      collection: "supervisor",
    });
  }

  private async _supervisorRestart(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: this.supervisor.localize(
        "confirm.restart.title",
        "name",
        "Supervisor"
      ),
      text: this.supervisor.localize(
        "confirm.restart.text",
        "name",
        "Supervisor"
      ),
      confirmText: this.supervisor.localize("common.restart"),
      dismissText: this.supervisor.localize("common.cancel"),
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await restartSupervisor(this.hass);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize(
          "common.failed_to_restart_name",
          "name",
          "Supervisor"
        ),
        text: extractApiErrorMessage(err),
      });
    } finally {
      button.progress = false;
    }
  }

  private async _diagnosticsInformationDialog(): Promise<void> {
    await showAlertDialog(this, {
      title: this.supervisor.localize(
        "system.supervisor.share_diagonstics_title"
      ),
      text: this.supervisor.localize(
        "system.supervisor.share_diagonstics_description",
        "line_break",
        html`<br /><br />`
      ),
    });
  }

  private async _unsupportedDialog(): Promise<void> {
    await showAlertDialog(this, {
      title: this.supervisor.localize("system.supervisor.unsupported_title"),
      text: html`${this.supervisor.localize(
          "system.supervisor.unsupported_description"
        )} <br /><br />
        <ul>
          ${this.supervisor.resolution.unsupported.map(
            (reason) => html`
              <li>
                <a
                  href=${documentationUrl(
                    this.hass,
                    UNSUPPORTED_REASON_URL[reason] ||
                      `/more-info/unsupported/${reason}`
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.supervisor.localize(
                    `system.supervisor.unsupported_reason.${reason}`
                  ) || reason}
                </a>
              </li>
            `
          )}
        </ul>`,
    });
  }

  private async _unhealthyDialog(): Promise<void> {
    await showAlertDialog(this, {
      title: this.supervisor.localize("system.supervisor.unhealthy_title"),
      text: html`${this.supervisor.localize(
          "system.supervisor.unhealthy_description"
        )} <br /><br />
        <ul>
          ${this.supervisor.resolution.unhealthy.map(
            (reason) => html`
              <li>
                <a
                  href=${documentationUrl(
                    this.hass,
                    UNHEALTHY_REASON_URL[reason] ||
                      `/more-info/unhealthy/${reason}`
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  ${this.supervisor.localize(
                    `system.supervisor.unhealthy_reason.${reason}`
                  ) || reason}
                </a>
              </li>
            `
          )}
        </ul>`,
    });
  }

  private async _toggleDiagnostics(): Promise<void> {
    try {
      const data: SupervisorOptions = {
        diagnostics: !this.supervisor.supervisor?.diagnostics,
      };
      await setSupervisorOption(this.hass, data);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize(
          "system.supervisor.failed_to_set_option"
        ),
        text: extractApiErrorMessage(err),
      });
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
          justify-content: space-between;
          align-items: center;
        }
        .card-content {
          display: flex;
          flex-direction: column;
          height: calc(100% - 124px);
          justify-content: space-between;
        }
        .metrics-block {
          margin-top: 16px;
        }
        button.link {
          color: var(--primary-color);
        }
        ha-settings-row {
          padding: 0;
          height: 54px;
          width: 100%;
        }
        ha-settings-row[three-line] {
          height: 74px;
        }
        ha-settings-row > div[slot="description"] {
          white-space: normal;
          color: var(--secondary-text-color);
        }
        ha-alert mwc-button {
          --mdc-theme-primary: var(--primary-text-color);
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
    "hassio-supervisor-info": HassioSupervisorInfo;
  }
}
