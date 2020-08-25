import "@material/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { HassioHostInfo as HassioHostInfoType } from "../../../src/data/hassio/host";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import {
  HassioSupervisorInfo as HassioSupervisorInfoType,
  reloadSupervisor,
  setSupervisorOption,
  SupervisorOptions,
  updateSupervisor,
} from "../../../src/data/hassio/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";

import "../../../src/components/ha-card";
import "../../../src/components/ha-settings-row";
import "../../../src/components/ha-switch";

@customElement("hassio-supervisor-info")
class HassioSupervisorInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public supervisorInfo!: HassioSupervisorInfoType;

  @property() public hostInfo!: HassioHostInfoType;

  public render(): TemplateResult | void {
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
              Newest version
            </span>
            <span slot="description">
              ${this.supervisorInfo.version_latest}
            </span>
            ${this.supervisorInfo.version !== this.supervisorInfo.version_latest
              ? html`
                  <mwc-button
                    title="Update the supervisor"
                    label="Update"
                    @click=${this._supervisorUpdate}
                  >
                  </mwc-button>
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
                  <mwc-button
                    @click=${this._toggleBeta}
                    label="Leave beta channel"
                    title="Get stable updates for Home Assistant, supervisor and host"
                  >
                  </mwc-button>
                `
              : this.supervisorInfo.channel === "stable"
              ? html`
                  <mwc-button
                    @click=${this._toggleBeta}
                    label="Join beta channel"
                    title="Get beta updates for Home Assistant (RCs), supervisor and host"
                  >
                  </mwc-button>
                `
              : ""}
          </ha-settings-row>

          ${this.supervisorInfo?.supported
            ? html` <ha-settings-row three-line>
                <span slot="heading">
                  Share diagnostics
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
          <mwc-button
            @click=${this._supervisorReload}
            title="Reload parts of the supervisor."
            label="Reload"
          >
          </mwc-button>
        </div>
      </ha-card>
    `;
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
        ha-settings-row[three-line] > div {
          white-space: normal;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }

  private async _toggleBeta(): Promise<void> {
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
        return;
      }
    }

    try {
      const data: Partial<SupervisorOptions> = {
        channel: this.supervisorInfo.channel !== "stable" ? "beta" : "stable",
      };
      await setSupervisorOption(this.hass, data);
      await reloadSupervisor(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to set supervisor option",
        text:
          typeof err === "object" ? err.body?.message || "Unkown error" : err,
      });
    }
  }

  private async _supervisorReload(): Promise<void> {
    try {
      await reloadSupervisor(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to reload the supervisor",
        text:
          typeof err === "object" ? err.body?.message || "Unkown error" : err,
      });
    }
  }

  private async _supervisorUpdate(): Promise<void> {
    try {
      await updateSupervisor(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to update the supervisor",
        text:
          typeof err === "object" ? err.body.message || "Unkown error" : err,
      });
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

  private async _toggleDiagnostics(): Promise<void> {
    try {
      const data: SupervisorOptions = {
        diagnostics: !this.supervisorInfo?.diagnostics,
      };
      await setSupervisorOption(this.hass, data);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to set supervisor option",
        text:
          typeof err === "object" ? err.body.message || "Unkown error" : err,
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-supervisor-info": HassioSupervisorInfo;
  }
}
