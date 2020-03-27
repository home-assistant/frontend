import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

import { fireEvent } from "../../../src/common/dom/fire_event";
import {
  HassioSupervisorInfo as HassioSupervisorInfoType,
  setSupervisorOption,
  SupervisorOptions,
} from "../../../src/data/hassio/supervisor";
import { HomeAssistant } from "../../../src/types";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";

import "../../../src/components/buttons/ha-call-api-button";

@customElement("hassio-supervisor-info")
class HassioSupervisorInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public supervisorInfo!: HassioSupervisorInfoType;
  @property() private _errors?: string;

  public render(): TemplateResult | void {
    return html`
      <paper-card>
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
          ${this._errors
            ? html`
                <div class="errors">Error: ${this._errors}</div>
              `
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
      </paper-card>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        paper-card {
          height: 100%;
          width: 100%;
        }
        .card-content {
          color: var(--primary-text-color);
          box-sizing: border-box;
          height: calc(100% - 47px);
        }
        .info {
          width: 100%;
        }
        .info td:nth-child(2) {
          text-align: right;
        }
        .errors {
          color: var(--google-red-500);
          margin-top: 16px;
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
    if (
      !confirm(`WARNING:
Beta releases are for testers and early adopters and can contain unstable code changes. Make sure you have backups of your data before you activate this feature.

This includes beta releases for:
- Home Assistant (Release Candidates)
- Hass.io supervisor
- Host system`)
    ) {
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-supervisor-info": HassioSupervisorInfo;
  }
}
