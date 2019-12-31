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

import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import {
  HassioHostInfo as HassioHostInfoType,
  HassioHassOSInfo,
} from "../../../src/data/hassio";
import { HomeAssistant } from "../../../src/types";

import { showHassioMarkdownDialog } from "../dialogs/markdown/show-dialog-hassio-markdown";

import "../../../src/components/buttons/ha-call-api-button";

@customElement("hassio-host-info")
class HassioHostInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public hostInfo!: HassioHostInfoType;
  @property() public hassOsInfo!: HassioHassOSInfo;
  @property() private errors!: String | null;

  public render(): TemplateResult | void {
    return html`
      <paper-card>
        <div class="card-content">
          <h2>Host system</h2>
          <table class="info">
            <tbody>
              <tr>
                <td>Hostname</td>
                <td>${this.hostInfo.hostname}</td>
              </tr>
              <tr>
                <td>System</td>
                <td>${this.hostInfo.operating_system}</td>
              </tr>
              ${this.hostInfo.deployment
                ? html`
                    <tr>
                      <td>Deployment</td>
                      <td>${this.hostInfo.deployment}</td>
                    </tr>
                  `
                : ""}
            </tbody>
          </table>
          <mwc-button raised @click=${this._showHardware} class="info">
            Hardware
          </mwc-button>
          ${this._featureAvailable(this.hostInfo, "hostname")
            ? html`
                <mwc-button
                  raised
                  @click=${this._changeHostnameClicked}
                  class="info"
                >
                  Change hostname
                </mwc-button>
              `
            : ""}
          ${this.errors
            ? html`
                <div class="errors">Error: ${this.errors}</div>
              `
            : ""}
        </div>
        <div class="card-actions">
          ${this._featureAvailable(this.hostInfo, "reboot")
            ? html`
                <ha-call-api-button
                  class="warning"
                  .hass=${this.hass}
                  path="hassio/host/reboot"
                  >Reboot</ha-call-api-button
                >
              `
            : ""}
          ${this._featureAvailable(this.hostInfo, "shutdown")
            ? html`
                <ha-call-api-button
                  class="warning"
                  .hass=${this.hass}
                  path="hassio/host/shutdown"
                  >Shutdown</ha-call-api-button
                >
              `
            : ""}
          ${this._featureAvailable(this.hostInfo, "hassos")
            ? html`
                <ha-call-api-button
                  class="warning"
                  .hass=${this.hass}
                  path="hassio/hassos/config/sync"
                  title="Load HassOS configs or updates from USB"
                  >Import from USB</ha-call-api-button
                >
              `
            : ""}
          ${this._computeUpdateAvailable(this.hassOsInfo)
            ? html`
                <ha-call-api-button
                  .hass=${this.hass}
                  path="hassio/hassos/update"
                  >Update</ha-call-api-button
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
          margin-left: 8px;
        }
        .card-content {
          height: 200px;
          color: var(--primary-text-color);
        }
        @media screen and (max-width: 830px) {
          paper-card {
            margin-top: 8px;
            margin-left: 0;
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
        mwc-button.info {
          max-width: calc(50% - 12px);
        }
        table.info {
          margin-bottom: 10px;
        }
        .warning {
          --mdc-theme-primary: var(--google-red-500);
        }
      `,
    ];
  }

  protected firstUpdated() {
    this.addEventListener("hass-api-called", (ev) => this.apiCalled(ev));
  }

  apiCalled(ev) {
    if (ev.detail.success) {
      this.errors = null;
      return;
    }

    var response = ev.detail.response;

    if (typeof response.body === "object") {
      this.errors = response.body.message || "Unknown error";
    } else {
      this.errors = response.body;
    }
  }

  _computeUpdateAvailable(data) {
    return data && this.hostInfo.version !== this.hostInfo.version_latest;
  }

  _featureAvailable(data, feature) {
    return (
      data && this.hostInfo.features && this.hostInfo.features.includes(feature)
    );
  }

  _showHardware() {
    this.hass
      .callApi("GET", "hassio/hardware/info")
      .then(
        (resp) => this._objectToMarkdown((resp as any).data),
        () => "Error getting hardware info"
      )
      .then((content) => {
        showHassioMarkdownDialog(this, {
          title: "Hardware",
          content: content,
        });
      });
  }

  _objectToMarkdown(obj, indent = "") {
    let data = "";
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] !== "object") {
        data += `${indent}- ${key}: ${obj[key]}\n`;
      } else {
        data += `${indent}- ${key}:\n`;
        if (Array.isArray(obj[key])) {
          if (obj[key].length) {
            data +=
              `${indent}    - ` + obj[key].join(`\n${indent}    - `) + "\n";
          }
        } else {
          data += this._objectToMarkdown(obj[key], `    ${indent}`);
        }
      }
    });
    return data;
  }

  _changeHostnameClicked() {
    const curHostname = this.hostInfo.hostname;
    const hostname = prompt("Please enter a new hostname:", curHostname);
    if (hostname && hostname !== curHostname) {
      this.hass.callApi("POST", "hassio/host/options", { hostname });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-host-info": HassioHostInfo;
  }
}
