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
import { HassioSupervisorInfo as HassioSupervisorInfoType } from "../../../src/data/hassio/supervisor";
import { HomeAssistant } from "../../../src/types";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";

import "../../../src/components/buttons/ha-call-api-button";

@customElement("hassio-supervisor-info")
class HassioSupervisorInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public supervisorInfo!: HassioSupervisorInfoType;
  @property() protected errors?: string;

  public render(): TemplateResult | void {
    return html`
      <paper-card>
        <div class="card-content">
          <h2>Hass.io supervisor</h2>
          <table class="info">
            <tbody>
              <tr>
                <td>Version</td>
                <td>${this.supervisorInfo.version}</td>
              </tr>
              <tr>
                <td>Latest version</td>
                <td>${this.supervisorInfo.last_version}</td>
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
          ${this.errors
            ? html`
                <div class="errors">Error: ${this.errors}</div>
              `
            : ""}
        </div>
        <div class="card-actions">
          <ha-call-api-button .hass=${this.hass} path="hassio/supervisor/reload"
            >Reload</ha-call-api-button
          >
          ${this.supervisorInfo.version !== this.supervisorInfo.last_version
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
          display: inline-block;
          width: 400px;
        }
        .card-content {
          height: 200px;
          color: var(--primary-text-color);
        }
        @media screen and (max-width: 830px) {
          paper-card {
            width: 100%;
          }
          .card-content {
            height: auto;
          }
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
      this.errors = undefined;
      return;
    }

    const response = ev.detail.response;

    this.errors =
      typeof response.body === "object"
        ? response.body.message || "Unknown error"
        : response.body;
  }

  private _joinBeta() {
    if (
      !confirm(`WARNING:
Beta releases are for testers and early adopters and can contain unstable code changes. Make sure you have backups of your data before you activate this feature.

This inludes beta releases for:
- Home Assistant (Release Candidates)
- Hass.io supervisor
- Host system`)
    ) {
      return;
    }
    const method = "POST";
    const path = "hassio/supervisor/options";
    const data = { channel: "beta" };

    const eventData: {
      method: string;
      path: string;
      data: { channel: string };
      success: boolean;
      response: unknown;
    } = {
      method,
      path,
      data,
      success: false,
      response: "",
    };

    this.hass
      .callApi(method, path, data)
      .then(
        (resp) => {
          eventData.success = true;
          eventData.response = resp;
        },
        (resp) => {
          eventData.success = false;
          eventData.response = resp;
        }
      )
      .then(() => {
        fireEvent(this, "hass-api-called", eventData);
      });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-supervisor-info": HassioSupervisorInfo;
  }
}
