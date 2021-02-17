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
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/buttons/ha-progress-button";
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

const UNSUPPORTED_REASON = {
  container: {
    title: "Containers known to cause issues",
    url: "/more-info/unsupported/container",
  },
  dbus: { title: "DBUS", url: "/more-info/unsupported/dbus" },
  docker_configuration: {
    title: "Docker Configuration",
    url: "/more-info/unsupported/docker_configuration",
  },
  docker_version: {
    title: "Docker Version",
    url: "/more-info/unsupported/docker_version",
  },
  job_conditions: {
    title: "Ignored job conditions",
    url: "/more-info/unsupported/job_conditions",
  },
  lxc: { title: "LXC", url: "/more-info/unsupported/lxc" },
  network_manager: {
    title: "Network Manager",
    url: "/more-info/unsupported/network_manager",
  },
  os: { title: "Operating System", url: "/more-info/unsupported/os" },
  privileged: {
    title: "Supervisor is not privileged",
    url: "/more-info/unsupported/privileged",
  },
  systemd: { title: "Systemd", url: "/more-info/unsupported/systemd" },
};

const UNHEALTHY_REASON = {
  privileged: {
    title: "Supervisor is not privileged",
    url: "/more-info/unsupported/privileged",
  },
  supervisor: {
    title: "Supervisor was not able to update",
    url: "/more-info/unhealthy/supervisor",
  },
  setup: {
    title: "Setup of the Supervisor failed",
    url: "/more-info/unhealthy/setup",
  },
  docker: {
    title: "The Docker environment is not working properly",
    url: "/more-info/unhealthy/docker",
  },
};

@customElement("hassio-supervisor-info")
class HassioSupervisorInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @internalProperty() private _metrics?: HassioStats;

  protected render(): TemplateResult | void {
    const metrics = [
      {
        description: "Supervisor CPU Usage",
        value: this._metrics?.cpu_percent,
      },
      {
        description: "Supervisor RAM Usage",
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
                Version
              </span>
              <span slot="description">
                supervisor-${this.supervisor.supervisor.version}
              </span>
            </ha-settings-row>
            <ha-settings-row>
              <span slot="heading">
                Newest Version
              </span>
              <span slot="description">
                supervisor-${this.supervisor.supervisor.version_latest}
              </span>
              ${this.supervisor.supervisor.update_available
                ? html`
                    <ha-progress-button
                      title="Update the supervisor"
                      @click=${this._supervisorUpdate}
                    >
                      Update
                    </ha-progress-button>
                  `
                : ""}
            </ha-settings-row>
            <ha-settings-row>
              <span slot="heading">
                Channel
              </span>
              <span slot="description">
                ${this.supervisor.supervisor.channel}
              </span>
              ${this.supervisor.supervisor.channel === "beta"
                ? html`
                    <ha-progress-button
                      @click=${this._toggleBeta}
                      title="Get stable updates for Home Assistant, supervisor and host"
                    >
                      Leave beta channel
                    </ha-progress-button>
                  `
                : this.supervisor.supervisor.channel === "stable"
                ? html`
                    <ha-progress-button
                      @click=${this._toggleBeta}
                      title="Get beta updates for Home Assistant (RCs), supervisor and host"
                    >
                      Join beta channel
                    </ha-progress-button>
                  `
                : ""}
            </ha-settings-row>

            ${this.supervisor.supervisor.supported
              ? html` <ha-settings-row three-line>
                  <span slot="heading">
                    Share Diagnostics
                  </span>
                  <div slot="description" class="diagnostics-description">
                    Share crash reports and diagnostic information.
                    <button
                      class="link"
                      title="Show more information about this"
                      @click=${this._diagnosticsInformationDialog}
                    >
                      Learn more
                    </button>
                  </div>
                  <ha-switch
                    haptic
                    .checked=${this.supervisor.supervisor.diagnostics}
                    @change=${this._toggleDiagnostics}
                  ></ha-switch>
                </ha-settings-row>`
              : html`<div class="error">
                  You are running an unsupported installation.
                  <button
                    class="link"
                    title="Learn more about how you can make your system compliant"
                    @click=${this._unsupportedDialog}
                  >
                    Learn more
                  </button>
                </div>`}
            ${!this.supervisor.supervisor.healthy
              ? html`<div class="error">
                  Your installation is running in an unhealthy state.
                  <button
                    class="link"
                    title="Learn more about why your system is marked as unhealthy"
                    @click=${this._unhealthyDialog}
                  >
                    Learn more
                  </button>
                </div>`
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
            title="Reload parts of the Supervisor"
          >
            Reload Supervisor
          </ha-progress-button>
          <ha-progress-button
            class="warning"
            @click=${this._supervisorRestart}
            title="Restart the Supervisor"
          >
            Restart Supervisor
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
        title: "WARNING",
        text: html` Beta releases are for testers and early adopters and can
          contain unstable code changes.
          <br />
          <b>
            Make sure you have backups of your data before you activate this
            feature.
          </b>
          <br /><br />
          This includes beta releases for:
          <li>Home Assistant Core</li>
          <li>Home Assistant Supervisor</li>
          <li>Home Assistant Operating System</li>
          <br />
          Do you want to join the beta channel?`,
        confirmText: "join beta",
        dismissText: "no",
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
        title: "Failed to set supervisor option",
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
        title: "Failed to reload the supervisor",
        text: extractApiErrorMessage(err),
      });
    } finally {
      button.progress = false;
    }
  }

  private async _reloadSupervisor(): Promise<void> {
    await reloadSupervisor(this.hass);
    fireEvent(this, "supervisor-store-refresh", { store: "supervisor" });
  }

  private async _supervisorRestart(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: "Restart the Supervisor",
      text: "Are you sure you want to restart the Supervisor",
      confirmText: "restart",
      dismissText: "cancel",
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await restartSupervisor(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to restart the supervisor",
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
      title: "Update Supervisor",
      text: `Are you sure you want to update supervisor to version ${this.supervisor.supervisor.version_latest}?`,
      confirmText: "update",
      dismissText: "cancel",
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await updateSupervisor(this.hass);
      fireEvent(this, "supervisor-store-refresh", { store: "supervisor" });
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to update the supervisor",
        text: extractApiErrorMessage(err),
      });
    } finally {
      button.progress = false;
    }
  }

  private async _diagnosticsInformationDialog(): Promise<void> {
    await showAlertDialog(this, {
      title: "Help Improve Home Assistant",
      text: html`Would you want to automatically share crash reports and
        diagnostic information when the supervisor encounters unexpected errors?
        <br /><br />
        This will allow us to fix the problems, the information is only
        accessible to the Home Assistant Core team and will not be shared with
        others.
        <br /><br />
        The data does not include any private/sensitive information and you can
        disable this in settings at any time you want.`,
    });
  }

  private async _unsupportedDialog(): Promise<void> {
    await showAlertDialog(this, {
      title: "You are running an unsupported installation",
      text: html`Below is a list of issues found with your installation, click
        on the links to learn how you can resolve the issues. <br /><br />
        <ul>
          ${this.supervisor.resolution.unsupported.map(
            (issue) => html`
              <li>
                ${UNSUPPORTED_REASON[issue]
                  ? html`<a
                      href="${documentationUrl(
                        this.hass,
                        UNSUPPORTED_REASON[issue].url
                      )}"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ${UNSUPPORTED_REASON[issue].title}
                    </a>`
                  : issue}
              </li>
            `
          )}
        </ul>`,
    });
  }

  private async _unhealthyDialog(): Promise<void> {
    await showAlertDialog(this, {
      title: "Your installation is unhealthy",
      text: html`Running an unhealthy installation will cause issues. Below is a
        list of issues found with your installation, click on the links to learn
        how you can resolve the issues. <br /><br />
        <ul>
          ${this.supervisor.resolution.unhealthy.map(
            (issue) => html`
              <li>
                ${UNHEALTHY_REASON[issue]
                  ? html`<a
                      href="${documentationUrl(
                        this.hass,
                        UNHEALTHY_REASON[issue].url
                      )}"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ${UNHEALTHY_REASON[issue].title}
                    </a>`
                  : issue}
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
        title: "Failed to set supervisor option",
        text: extractApiErrorMessage(err),
      });
    }
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
