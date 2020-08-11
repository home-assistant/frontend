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
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";

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
import { mdiDotsVertical } from "@mdi/js";
import { HassioInfo } from "../../../src/data/hassio/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/components/ha-settings-row";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { showHassioMarkdownDialog } from "../dialogs/markdown/show-dialog-hassio-markdown";
import { hassioStyle } from "../resources/hassio-style";
import "../../../src/components/ha-button-menu";
import "@material/mwc-list/mwc-list-item";
import "../../../src/components/ha-card";

@customElement("hassio-host-info")
class HassioHostInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public hostInfo!: HassioHostInfoType;

  @property({ attribute: false }) public hassioInfo!: HassioInfo;

  @property({ attribute: false }) public hassOsInfo!: HassioHassOSInfo;

  @internalProperty() private _errors?: string;

  public render(): TemplateResult | void {
    return html`
      <ha-card header="Host System">
        <div class="card-content">
          ${this.hostInfo.features.includes("hostname")
            ? html` <ha-settings-row>
                <span slot="heading">
                  Hostname
                </span>
                <span slot="description">
                  ${this.hostInfo.hostname}
                </span>
                <mwc-button
                  title="Change the hostname"
                  @click=${this._changeHostnameClicked}
                >
                  Change
                </mwc-button>
              </ha-settings-row>`
            : ""}
          <ha-settings-row>
            <span slot="heading">
              System
            </span>
            <span slot="description">
              ${this.hostInfo.operating_system}
            </span>
            ${this.hostInfo.version === this.hostInfo.version_latest
              ? html`
                  <mwc-button
                    title="Update the host OS"
                    @click=${this._updateOS}
                    >Update</mwc-button
                  >
                `
              : ""}
          </ha-settings-row>
          ${this.hostInfo.features.includes("hassos")
            ? html` <ha-settings-row>
                <span slot="heading">
                  Docker version
                </span>
                <span slot="description">
                  ${this.hassioInfo.docker}
                </span>
              </ha-settings-row>`
            : ""}
          ${this.hostInfo.deployment
            ? html` <ha-settings-row>
                <span slot="heading">
                  Deployment
                </span>
                <span slot="description">
                  ${this.hostInfo.deployment}
                </span>
              </ha-settings-row>`
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

          <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
            <mwc-icon-button
              .title=${this.hass.localize("ui.common.menu")}
              .label=${this.hass.localize("ui.common.overflow_menu")}
              slot="trigger"
            >
              <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
            </mwc-icon-button>
            <mwc-list-item
              title="Show a list of hardware
            "
              >Hardware
            </mwc-list-item>
            ${this.hostInfo.features.includes("hassos")
              ? html` <mwc-list-item
                  class="warning"
                  title="Load HassOS configs or updates from USB"
                >
                  Import from USB
                </mwc-list-item>`
              : ""}
          </ha-button-menu>
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
        mwc-button.info {
          max-width: calc(50% - 12px);
        }
        .warning {
          --mdc-theme-primary: var(--error-color);
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
        ha-button-menu {
          color: var(--secondary-text-color);
          --mdc-menu-min-width: 200px;
        }
        @media (min-width: 563px) {
          paper-listbox {
            max-height: 150px;
            overflow: auto;
          }
        }
        paper-item {
          cursor: pointer;
          min-height: 35px;
        }
        mwc-list-item ha-svg-icon {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }

  protected firstUpdated(): void {
    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._showHardware();
        break;
      case 1:
        await this._importFromUSB();
        break;
    }
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

  private async _importFromUSB(): Promise<void> {
    this._errors = undefined;
    try {
      await changeHostOptions(this.hass, { hostname });
      this.hostInfo = await fetchHassioHostInfo(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to import from USB",
        text: err.body?.message || err,
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-host-info": HassioHostInfo;
  }
}
