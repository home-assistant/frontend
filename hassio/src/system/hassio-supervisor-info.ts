import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-card";
import "../../../src/components/ha-settings-row";
import "../../../src/components/ha-switch";
import { HassioHostInfo as HassioHostInfoType } from "../../../src/data/hassio/host";
import {
  HassioSupervisorInfo as HassioSupervisorInfoType,
  reloadSupervisor,
  setSupervisorOption,
  SupervisorOptions,
  updateSupervisor,
  fetchHassioSupervisorInfo,
} from "../../../src/data/hassio/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { hassioStyle } from "../resources/hassio-style";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";

@customElement("hassio-supervisor-info")
class HassioSupervisorInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public supervisorInfo!: HassioSupervisorInfoType;

  @property() public hostInfo!: HassioHostInfoType;

  protected render(): TemplateResult | void {
    return html`
      <ha-card header="Supervisor">
        <div class="card-content">
          <ha-settings-row>
            <span slot="heading">
              Version
            </span>
            <span slot="description">
              ${this.supervisorInfo.version}
            </span>
          </ha-settings-row>
          <ha-settings-row>
            <span slot="heading">
              Newest Version
            </span>
            <span slot="description">
              ${this.supervisorInfo.version_latest}
            </span>
            ${this.supervisorInfo.version !== this.supervisorInfo.version_latest
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
              ${this.supervisorInfo.channel}
            </span>
            ${this.supervisorInfo.channel === "beta"
              ? html`
                  <ha-progress-button
                    @click=${this._toggleBeta}
                    title="Get stable updates for Home Assistant, supervisor and host"
                  >
                    Leave beta channel
                  </ha-progress-button>
                `
              : this.supervisorInfo.channel === "stable"
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

          ${this.supervisorInfo?.supported
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
                  .checked=${this.supervisorInfo.diagnostics}
                  @change=${this._toggleDiagnostics}
                ></ha-switch>
              </ha-settings-row>`
            : html`<div class="error">
                You are running an unsupported installation.
                <a
                  href="https://github.com/home-assistant/architecture/blob/master/adr/${this.hostInfo.features.includes(
                    "hassos"
                  )
                    ? "0015-home-assistant-os.md"
                    : "0014-home-assistant-supervised.md"}"
                  target="_blank"
                  rel="noreferrer"
                  title="Learn more about how you can make your system compliant"
                >
                  Learn More
                </a>
              </div>`}
        </div>
        <div class="card-actions">
          <ha-progress-button
            @click=${this._supervisorReload}
            title="Reload parts of the supervisor"
          >
            Reload
          </ha-progress-button>
        </div>
      </ha-card>
    `;
  }

  private async _toggleBeta(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    if (this.supervisorInfo.channel === "stable") {
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
        channel: this.supervisorInfo.channel === "stable" ? "beta" : "stable",
      };
      await setSupervisorOption(this.hass, data);
      await reloadSupervisor(this.hass);
      this.supervisorInfo = await fetchHassioSupervisorInfo(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to set supervisor option",
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private async _supervisorReload(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await reloadSupervisor(this.hass);
      this.supervisorInfo = await fetchHassioSupervisorInfo(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to reload the supervisor",
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private async _supervisorUpdate(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: "Update Supervisor",
      text: `Are you sure you want to update supervisor to version ${this.supervisorInfo.version_latest}?`,
      confirmText: "update",
      dismissText: "cancel",
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await updateSupervisor(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to update the supervisor",
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
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

  private async _toggleDiagnostics(): Promise<void> {
    try {
      const data: SupervisorOptions = {
        diagnostics: !this.supervisorInfo?.diagnostics,
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
