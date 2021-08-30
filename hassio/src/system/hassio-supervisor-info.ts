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
  updateSupervisor,
} from "../../../src/data/hassio/supervisor";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { bytesToString } from "../../../src/util/bytes-to-string";
import { documentationUrl } from "../../../src/util/documentation-url";
import "../components/supervisor-metric";
import { hassioStyle } from "../resources/hassio-style";

const UNSUPPORTED_REASON_URL = {
  apparmor: "/more-info/unsupported/apparmor",
  container: "/more-info/unsupported/container",
  dbus: "/more-info/unsupported/dbus",
  docker_configuration: "/more-info/unsupported/docker_configuration",
  docker_version: "/more-info/unsupported/docker_version",
  job_conditions: "/more-info/unsupported/job_conditions",
  lxc: "/more-info/unsupported/lxc",
  network_manager: "/more-info/unsupported/network_manager",
  os: "/more-info/unsupported/os",
  privileged: "/more-info/unsupported/privileged",
  systemd: "/more-info/unsupported/systemd",
  content_trust: "/more-info/unsupported/content_trust",
};

const UNHEALTHY_REASON_URL = {
  privileged: "/more-info/unsupported/privileged",
  supervisor: "/more-info/unhealthy/supervisor",
  setup: "/more-info/unhealthy/setup",
  docker: "/more-info/unhealthy/docker",
  untrusted: "/more-info/unhealthy/untrusted",
};

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
      <ha-card header="Supervisor">
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
              ${this.supervisor.supervisor.update_available
                ? html`
                    <ha-progress-button
                      .title=${this.supervisor.localize(
                        "system.supervisor.update_supervisor"
                      )}
                      @click=${this._supervisorUpdate}
                    >
                      ${this.supervisor.localize("common.update")}
                    </ha-progress-button>
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
              : html`<ha-alert
                  alert-type="warning"
                  .actionText=${this.supervisor.localize("common.learn_more")}
                  @alert-action-clicked=${this._unsupportedDialog}
                >
                  ${this.supervisor.localize(
                    "system.supervisor.unsupported_title"
                  )}
                </ha-alert>`}
            ${!this.supervisor.supervisor.healthy
              ? html`<ha-alert
                  alert-type="error"
                  .actionText=${this.supervisor.localize("common.learn_more")}
                  @alert-action-clicked=${this._unhealthyDialog}
                >
                  ${this.supervisor.localize(
                    "system.supervisor.unhealthy_title"
                  )}
                </ha-alert>`
              : ""}
          </div>
          <div class="metrics-block">
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
      const confirmed = await showConfirmationDialog(this, {
        title: this.supervisor.localize("system.supervisor.warning"),
        text: html`${this.supervisor.localize("system.supervisor.beta_warning")}
          <br />
          <b> ${this.supervisor.localize("system.supervisor.beta_backup")} </b>
          <br /><br />
          ${this.supervisor.localize("system.supervisor.beta_release_items")}
          <ul>
            <li>Home Assistant Core</li>
            <li>Home Assistant Supervisor</li>
            <li>Home Assistant Operating System</li>
          </ul>
          <br />
          ${this.supervisor.localize("system.supervisor.beta_join_confirm")}`,
        confirmText: this.supervisor.localize(
          "system.supervisor.join_beta_action"
        ),
        dismissText: this.supervisor.localize("common.cancel"),
      });

      if (!confirmed) {
        button.progress = false;
        return;
      }
    }

    try {
      const data: Partial<SupervisorOptions> = {
        channel:
          this.supervisor.supervisor.channel === "stable" ? "beta" : "stable",
      };
      await setSupervisorOption(this.hass, data);
      await this._reloadSupervisor();
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize(
          "system.supervisor.failed_to_set_option"
        ),
        text: extractApiErrorMessage(err),
      });
    } finally {
      button.progress = false;
    }
  }

  private async _supervisorReload(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await this._reloadSupervisor();
    } catch (err) {
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
    } catch (err) {
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

  private async _supervisorUpdate(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: this.supervisor.localize(
        "confirm.update.title",
        "name",
        "Supervisor"
      ),
      text: this.supervisor.localize(
        "confirm.update.text",
        "name",
        "Supervisor",
        "version",
        this.supervisor.supervisor.version_latest
      ),
      confirmText: this.supervisor.localize("common.update"),
      dismissText: this.supervisor.localize("common.cancel"),
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await updateSupervisor(this.hass);
      fireEvent(this, "supervisor-collection-refresh", {
        collection: "supervisor",
      });
    } catch (err) {
      showAlertDialog(this, {
        title: this.supervisor.localize(
          "common.failed_to_update_name",
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
                ${UNSUPPORTED_REASON_URL[reason]
                  ? html`<a
                      href="${documentationUrl(
                        this.hass,
                        UNSUPPORTED_REASON_URL[reason]
                      )}"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ${this.supervisor.localize(
                        `system.supervisor.unsupported_reason.${reason}`
                      ) || reason}
                    </a>`
                  : reason}
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
                ${UNHEALTHY_REASON_URL[reason]
                  ? html`<a
                      href="${documentationUrl(
                        this.hass,
                        UNHEALTHY_REASON_URL[reason]
                      )}"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ${this.supervisor.localize(
                        `system.supervisor.unhealthy_reason.${reason}`
                      ) || reason}
                    </a>`
                  : reason}
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
    } catch (err) {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-supervisor-info": HassioSupervisorInfo;
  }
}
