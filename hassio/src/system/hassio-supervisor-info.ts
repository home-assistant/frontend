import "@material/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/buttons/ha-call-api-button";
import "../../../src/components/ha-card";
import {
  HassioSupervisorInfo as HassioSupervisorInfoType,
  setSupervisorOption,
  SupervisorOptions,
} from "../../../src/data/hassio/supervisor";
import "../../../src/components/ha-switch";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/components/ha-settings-row";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-supervisor-info")
class HassioSupervisorInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public supervisorInfo!: HassioSupervisorInfoType;

  @internalProperty() private _errors?: string;

  public render(): TemplateResult | void {
    return html`
      <ha-card>
        <div class="card-content">
          <h2>Supervisor</h2>
          <table class="info">
            <tbody>
              <tr>
                <td>Version</td>
                <td>${this.supervisorInfo.version}</td>
              </tr>
              <tr>
                <td>Latest version</td>
                <td>${this.supervisorInfo.version_latest}</td>
              </tr>
              ${this.supervisorInfo.channel !== "stable"
                ? html`
                    <tr>
                      <td>Channel</td>
                      <td>${this.supervisorInfo.channel}</td>
                    </tr>
                  `
                : ""}
            </tbody>
          </table>
          <div class="options">
            <ha-settings-row>
              <span slot="heading">
                Share Diagnostics
              </span>
              <div slot="description" class="diagnostics-description">
                Share crash reports and diagnostic information.
                <button
                  class="link"
                  @click=${this._diagnosticsInformationDialog}
                >
                  Learn more
                </button>
              </div>
              <ha-switch
                .checked=${this.supervisorInfo.diagnostics}
                @change=${this._toggleDiagnostics}
              ></ha-switch>
            </ha-settings-row>
          </div>
          ${this._errors
            ? html` <div class="errors">Error: ${this._errors}</div> `
            : ""}
        </div>
        <div class="card-actions">
          <ha-call-api-button .hass=${this.hass} path="hassio/supervisor/reload"
            >Reload</ha-call-api-button
          >
          ${this.supervisorInfo.version !== this.supervisorInfo.version_latest
            ? html`
                <ha-call-api-button
                  .hass=${this.hass}
                  path="hassio/supervisor/update"
                  >Update</ha-call-api-button
                >
              `
            : ""}
          ${this.supervisorInfo.channel === "beta"
            ? html`
                <ha-call-api-button
                  .hass=${this.hass}
                  path="hassio/supervisor/options"
                  .data=${{ channel: "stable" }}
                  >Leave beta channel</ha-call-api-button
                >
              `
            : ""}
          ${this.supervisorInfo.channel === "stable"
            ? html`
                <mwc-button
                  @click=${this._joinBeta}
                  class="warning"
                  title="Get beta updates for Home Assistant (RCs), supervisor and host"
                  >Join beta channel</mwc-button
                >
              `
            : ""}
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
          width: 100%;
        }
        .card-content {
          color: var(--primary-text-color);
          box-sizing: border-box;
          height: calc(100% - 47px);
        }
        .info,
        .options {
          width: 100%;
        }
        .info td:nth-child(2) {
          text-align: right;
        }
        .errors {
          color: var(--error-color);
          margin-top: 16px;
        }
        ha-settings-row {
          padding: 0;
        }
        button.link {
          color: var(--primary-color);
        }
        .diagnostics-description {
          white-space: normal;
          padding: 0;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }

  protected firstUpdated(): void {
    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
  }

  private _apiCalled(ev): void {
    if (ev.detail.success) {
      this._errors = undefined;
      return;
    }

    const response = ev.detail.response;

    this._errors =
      typeof response.body === "object"
        ? response.body.message || "Unknown error"
        : response.body;
  }

  private async _joinBeta() {
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

    try {
      const data: SupervisorOptions = { channel: "beta" };
      await setSupervisorOption(this.hass, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._errors = `Error joining beta channel, ${err.body?.message || err}`;
    }
  }

  private async _diagnosticsInformationDialog() {
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

  private async _toggleDiagnostics() {
    try {
      const data: SupervisorOptions = {
        diagnostics: !this.supervisorInfo?.diagnostics,
      };
      await setSupervisorOption(this.hass, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._errors = `Error changing supervisor setting, ${
        err.body?.message || err
      }`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-supervisor-info": HassioSupervisorInfo;
  }
}
