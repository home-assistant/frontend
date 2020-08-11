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
              Latest Version
            </span>
            <span slot="description">
              ${this.supervisorInfo.version_latest}
            </span>
            ${this.supervisorInfo.version === this.supervisorInfo.version_latest
              ? html`
                  <mwc-button
                    title="Update the supervisor"
                    @click=${() => console.log("")}
                    >Update</mwc-button
                  >
                `
              : ""}
          </ha-settings-row>
          ${this.supervisorInfo.channel !== "stable"
            ? html`
                <ha-settings-row>
                  <span slot="heading">
                    Channel
                  </span>
                  <span slot="description">
                    ${this.supervisorInfo.channel}
                  </span>
                </ha-settings-row>
              `
            : ""}

          <ha-settings-row>
            <span slot="heading">
              Share Diagnostics
            </span>
            <div slot="description" class="diagnostics-description">
              Share crash reports and diagnostic information.
              <button class="link" @click=${this._diagnosticsInformationDialog}>
                Learn more
              </button>
            </div>
            <ha-switch
              .checked=${this.supervisorInfo.diagnostics}
              @change=${this._toggleDiagnostics}
            ></ha-switch>
          </ha-settings-row>

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
        .errors {
          color: var(--error-color);
          margin-top: 16px;
        }
        ha-settings-row {
          padding: 8px 0;
          width: 100%;
          height: 32px;
        }
        ha-settings-row:first-child {
          padding: 0px 0 8px;
        }
        ha-settings-row:last-child {
          padding: 8px 0 0;
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
