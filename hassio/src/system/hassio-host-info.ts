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
import "../../../src/components/buttons/ha-call-api-button";
import { fetchHassioHardwareInfo } from "../../../src/data/hassio/hardware";
import {
  changeHostOptions,
  fetchHassioHostInfo,
  HassioHassOSInfo,
  HassioHostInfo as HassioHostInfoType,
  rebootHost,
  shutdownHost,
  updateOS,
} from "../../../src/data/hassio/host";
import { HassioInfo } from "../../../src/data/hassio/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { showHassioMarkdownDialog } from "../dialogs/markdown/show-dialog-hassio-markdown";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-host-info")
class HassioHostInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public hostInfo!: HassioHostInfoType;

  @property({ attribute: false }) public hassioInfo!: HassioInfo;

  @property({ attribute: false }) public hassOsInfo!: HassioHassOSInfo;

  @internalProperty() private _errors?: string;

  public render(): TemplateResult | void {
    return html`
      <ha-card>
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
              ${!this.hostInfo.features.includes("hassos")
                ? html`<tr>
                    <td>Docker version</td>
                    <td>${this.hassioInfo.docker}</td>
                  </tr>`
                : ""}
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
            ? html` <div class="errors">Error: ${this._errors}</div> `
            : ""}
        </div>
        <div class="card-actions">
          ${this.hostInfo.features.includes("reboot")
            ? html`
                <mwc-button class="warning" @click=${this._rebootHost}
                  >Reboot</mwc-button
                >
              `
            : ""}
          ${this.hostInfo.features.includes("shutdown")
            ? html`
                <mwc-button class="warning" @click=${this._shutdownHost}
                  >Shutdown</mwc-button
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
            ? html` <mwc-button @click=${this._updateOS}>Update</mwc-button> `
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
        .info {
          width: 100%;
        }
        .info td:nth-child(2) {
          text-align: right;
        }
        .errors {
          color: var(--error-color);
          margin-top: 16px;
        }
        mwc-button.info {
          max-width: calc(50% - 12px);
        }
        table.info {
          margin-bottom: 10px;
        }
        .warning {
          --mdc-theme-primary: var(--error-color);
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

  private async _rebootHost(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: "Reboot",
      text: "Are you sure you want to reboot the host?",
      confirmText: "reboot host",
      dismissText: "no",
    });

    if (!confirmed) {
      return;
    }

    try {
      await rebootHost(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to reboot",
        text: err.body.message,
      });
    }
  }

  private async _shutdownHost(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: "Shutdown",
      text: "Are you sure you want to shutdown the host?",
      confirmText: "shutdown host",
      dismissText: "no",
    });

    if (!confirmed) {
      return;
    }

    try {
      await shutdownHost(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to shutdown",
        text: err.body.message,
      });
    }
  }

  private async _updateOS(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: "Update",
      text: "Are you sure you want to update the OS?",
      confirmText: "update os",
      dismissText: "no",
    });

    if (!confirmed) {
      return;
    }

    try {
      await updateOS(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to update",
        text: err.body.message,
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

  private async _changeHostnameClicked(): Promise<void> {
    const curHostname: string = this.hostInfo.hostname;
    const hostname = await showPromptDialog(this, {
      title: "Change hostname",
      inputLabel: "Please enter a new hostname:",
      inputType: "string",
      defaultValue: curHostname,
    });

    if (hostname && hostname !== curHostname) {
      try {
        await changeHostOptions(this.hass, { hostname });
        this.hostInfo = await fetchHassioHostInfo(this.hass);
      } catch (err) {
        showAlertDialog(this, {
          title: "Setting hostname failed",
          text: err.body.message,
        });
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-host-info": HassioHostInfo;
  }
}
