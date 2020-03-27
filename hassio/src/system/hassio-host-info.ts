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
} from "../../../src/data/hassio/host";
import { fetchHassioHardwareInfo } from "../../../src/data/hassio/hardware";
import { HomeAssistant } from "../../../src/types";
import { showHassioMarkdownDialog } from "../dialogs/markdown/show-dialog-hassio-markdown";

import "../../../src/components/buttons/ha-call-api-button";

@customElement("hassio-host-info")
class HassioHostInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public hostInfo!: HassioHostInfoType;
  @property() public hassOsInfo!: HassioHassOSInfo;
  @property() private _errors?: string;

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
          ${this.hostInfo.features.includes("hostname")
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
          ${this._errors
            ? html`
                <div class="errors">Error: ${this._errors}</div>
              `
            : ""}
        </div>
        <div class="card-actions">
          ${this.hostInfo.features.includes("reboot")
            ? html`
                <ha-call-api-button
                  class="warning"
                  .hass=${this.hass}
                  path="hassio/host/reboot"
                  >Reboot</ha-call-api-button
                >
              `
            : ""}
          ${this.hostInfo.features.includes("shutdown")
            ? html`
                <ha-call-api-button
                  class="warning"
                  .hass=${this.hass}
                  path="hassio/host/shutdown"
                  >Shutdown</ha-call-api-button
                >
              `
            : ""}
          ${this.hostInfo.features.includes("hassos")
            ? html`
                <ha-call-api-button
                  class="warning"
                  .hass=${this.hass}
                  path="hassio/os/config/sync"
                  title="Load HassOS configs or updates from USB"
                  >Import from USB</ha-call-api-button
                >
              `
            : ""}
          ${this.hostInfo.version !== this.hostInfo.version_latest
            ? html`
                <ha-call-api-button .hass=${this.hass} path="hassio/os/update"
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

  private async _showHardware(): Promise<void> {
    try {
      const content = this._objectToMarkdown(
        await fetchHassioHardwareInfo(this.hass)
      );
      showHassioMarkdownDialog(this, {
        title: "Hardware",
        content,
      });
    } catch (err) {
      showHassioMarkdownDialog(this, {
        title: "Hardware",
        content: "Error getting hardware info",
      });
    }
  }

  private _objectToMarkdown(obj, indent = ""): string {
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

  private _changeHostnameClicked(): void {
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
