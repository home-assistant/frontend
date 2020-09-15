import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import { safeDump } from "js-yaml";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-card";
import "../../../src/components/ha-settings-row";
import {
  extractApiErrorMessage,
  ignoredStatusCodes,
} from "../../../src/data/hassio/common";
import { fetchHassioHardwareInfo } from "../../../src/data/hassio/hardware";
import {
  changeHostOptions,
  configSyncOS,
  fetchHassioHostInfo,
  HassioHassOSInfo,
  HassioHostInfo as HassioHostInfoType,
  rebootHost,
  shutdownHost,
  updateOS,
} from "../../../src/data/hassio/host";
import {
  fetchNetworkInfo,
  NetworkInfo,
} from "../../../src/data/hassio/network";
import { HassioInfo } from "../../../src/data/hassio/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { showHassioMarkdownDialog } from "../dialogs/markdown/show-dialog-hassio-markdown";
import { showNetworkDialog } from "../dialogs/network/show-dialog-network";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-host-info")
class HassioHostInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public hostInfo!: HassioHostInfoType;

  @property({ attribute: false }) public hassioInfo!: HassioInfo;

  @property({ attribute: false }) public hassOsInfo!: HassioHassOSInfo;

  @internalProperty() public _networkInfo?: NetworkInfo;

  protected render(): TemplateResult | void {
    const primaryIpAddress = this.hostInfo.features.includes("network")
      ? this._primaryIpAddress(this._networkInfo!)
      : "";
    return html`
      <ha-card header="Host System">
        <div class="card-content">
          ${this.hostInfo.features.includes("hostname")
            ? html`<ha-settings-row>
                <span slot="heading">
                  Hostname
                </span>
                <span slot="description">
                  ${this.hostInfo.hostname}
                </span>
                <mwc-button
                  title="Change the hostname"
                  label="Change"
                  @click=${this._changeHostnameClicked}
                >
                </mwc-button>
              </ha-settings-row>`
            : ""}
          ${this.hostInfo.features.includes("network") &&
          atLeastVersion(this.hass.config.version, 0, 115)
            ? html` <ha-settings-row>
                <span slot="heading">
                  IP address
                </span>
                <span slot="description">
                  ${primaryIpAddress}
                </span>
                <mwc-button
                  title="Change the network"
                  label="Change"
                  @click=${this._changeNetworkClicked}
                >
                </mwc-button>
              </ha-settings-row>`
            : ""}

          <ha-settings-row>
            <span slot="heading">
              Operating system
            </span>
            <span slot="description">
              ${this.hostInfo.operating_system}
            </span>
            ${this.hostInfo.version !== this.hostInfo.version_latest &&
            this.hostInfo.features.includes("hassos")
              ? html`
                  <ha-progress-button
                    title="Update the host OS"
                    @click=${this._osUpdate}
                  >
                    Update
                  </ha-progress-button>
                `
              : ""}
          </ha-settings-row>
          ${!this.hostInfo.features.includes("hassos")
            ? html`<ha-settings-row>
                <span slot="heading">
                  Docker version
                </span>
                <span slot="description">
                  ${this.hassioInfo.docker}
                </span>
              </ha-settings-row>`
            : ""}
          ${this.hostInfo.deployment
            ? html`<ha-settings-row>
                <span slot="heading">
                  Deployment
                </span>
                <span slot="description">
                  ${this.hostInfo.deployment}
                </span>
              </ha-settings-row>`
            : ""}
        </div>
        <div class="card-actions">
          ${this.hostInfo.features.includes("reboot")
            ? html`
                <ha-progress-button
                  title="Reboot the host OS"
                  class="warning"
                  @click=${this._hostReboot}
                >
                  Reboot
                </ha-progress-button>
              `
            : ""}
          ${this.hostInfo.features.includes("shutdown")
            ? html`
                <ha-progress-button
                  title="Shutdown the host OS"
                  class="warning"
                  @click=${this._hostShutdown}
                >
                  Shutdown
                </ha-progress-button>
              `
            : ""}

          <ha-button-menu
            corner="BOTTOM_START"
            @action=${this._handleMenuAction}
          >
            <mwc-icon-button slot="trigger">
              <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
            </mwc-icon-button>
            <mwc-list-item title="Show a list of hardware">
              Hardware
            </mwc-list-item>
            ${this.hostInfo.features.includes("hassos")
              ? html`<mwc-list-item
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

  protected firstUpdated(): void {
    this._loadData();
  }

  private _primaryIpAddress = memoizeOne((network_info: NetworkInfo) => {
    if (!network_info) {
      return "";
    }
    return Object.keys(network_info?.interfaces)
      .map((device) => network_info.interfaces[device])
      .find((device) => device.primary)?.ip_address;
  });

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        await this._showHardware();
        break;
      case 1:
        await this._importFromUSB();
        break;
    }
  }

  private async _showHardware(): Promise<void> {
    try {
      const content = await fetchHassioHardwareInfo(this.hass);
      showHassioMarkdownDialog(this, {
        title: "Hardware",
        content: `<pre>${safeDump(content, { indent: 2 })}</pre>`,
      });
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to get Hardware list",
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _hostReboot(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: "Reboot",
      text: "Are you sure you want to reboot the host?",
      confirmText: "reboot host",
      dismissText: "no",
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await rebootHost(this.hass);
    } catch (err) {
      // Ignore connection errors, these are all expected
      if (err.status_code && !ignoredStatusCodes.has(err.status_code)) {
        showAlertDialog(this, {
          title: "Failed to reboot",
          text: extractApiErrorMessage(err),
        });
      }
    }
    button.progress = false;
  }

  private async _hostShutdown(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: "Shutdown",
      text: "Are you sure you want to shutdown the host?",
      confirmText: "shutdown host",
      dismissText: "no",
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await shutdownHost(this.hass);
    } catch (err) {
      // Ignore connection errors, these are all expected
      if (err.status_code && !ignoredStatusCodes.has(err.status_code)) {
        showAlertDialog(this, {
          title: "Failed to shutdown",
          text: extractApiErrorMessage(err),
        });
      }
    }
    button.progress = false;
  }

  private async _osUpdate(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: "Update",
      text: "Are you sure you want to update the OS?",
      confirmText: "update os",
      dismissText: "no",
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await updateOS(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to update",
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private async _changeNetworkClicked(): Promise<void> {
    showNetworkDialog(this, {
      network: this._networkInfo!,
      loadData: () => this._loadData(),
    });
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
          text: extractApiErrorMessage(err),
        });
      }
    }
  }

  private async _importFromUSB(): Promise<void> {
    try {
      await configSyncOS(this.hass);
      this.hostInfo = await fetchHassioHostInfo(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to import from USB",
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _loadData(): Promise<void> {
    this._networkInfo = await fetchNetworkInfo(this.hass);
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
        ha-settings-row {
          padding: 0;
          height: 54px;
          width: 100%;
        }
        ha-settings-row[three-line] {
          height: 74px;
        }
        ha-settings-row > span[slot="description"] {
          white-space: normal;
          color: var(--secondary-text-color);
        }

        .warning {
          --mdc-theme-primary: var(--error-color);
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-host-info": HassioHostInfo;
  }
}
