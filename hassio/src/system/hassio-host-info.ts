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
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../src/common/dom/fire_event";
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
  rebootHost,
  shutdownHost,
  updateOS,
} from "../../../src/data/hassio/host";
import {
  fetchNetworkInfo,
  NetworkInfo,
} from "../../../src/data/hassio/network";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import {
  getValueInPercentage,
  roundWithOneDecimal,
} from "../../../src/util/calculate";
import "../components/supervisor-metric";
import { showHassioMarkdownDialog } from "../dialogs/markdown/show-dialog-hassio-markdown";
import { showNetworkDialog } from "../dialogs/network/show-dialog-network";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-host-info")
class HassioHostInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  protected render(): TemplateResult | void {
    const primaryIpAddress = this.supervisor.host.features.includes("network")
      ? this._primaryIpAddress(this.supervisor.network!)
      : "";

    const metrics = [
      {
        description: "Used Space",
        value: this._getUsedSpace(
          this.supervisor.host.disk_used,
          this.supervisor.host.disk_total
        ),
        tooltip: `${this.supervisor.host.disk_used} GB/${this.supervisor.host.disk_total} GB`,
      },
    ];
    return html`
      <ha-card header="Host">
        <div class="card-content">
          <div>
            ${this.supervisor.host.features.includes("hostname")
              ? html`<ha-settings-row>
                  <span slot="heading">
                    Hostname
                  </span>
                  <span slot="description">
                    ${this.supervisor.host.hostname}
                  </span>
                  <mwc-button
                    title="Change the hostname"
                    label="Change"
                    @click=${this._changeHostnameClicked}
                  >
                  </mwc-button>
                </ha-settings-row>`
              : ""}
            ${this.supervisor.host.features.includes("network")
              ? html` <ha-settings-row>
                  <span slot="heading">
                    IP Address
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
                Operating System
              </span>
              <span slot="description">
                ${this.supervisor.host.operating_system}
              </span>
              ${this.supervisor.os.update_available
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
            ${!this.supervisor.host.features.includes("hassos")
              ? html`<ha-settings-row>
                  <span slot="heading">
                    Docker version
                  </span>
                  <span slot="description">
                    ${this.supervisor.info.docker}
                  </span>
                </ha-settings-row>`
              : ""}
            ${this.supervisor.host.deployment
              ? html`<ha-settings-row>
                  <span slot="heading">
                    Deployment
                  </span>
                  <span slot="description">
                    ${this.supervisor.host.deployment}
                  </span>
                </ha-settings-row>`
              : ""}
          </div>
          <div>
            ${this.supervisor.host.disk_life_time !== "" &&
            this.supervisor.host.disk_life_time >= 10
              ? html` <ha-settings-row>
                  <span slot="heading">
                    eMMC Lifetime Used
                  </span>
                  <span slot="description">
                    ${this.supervisor.host.disk_life_time - 10}% -
                    ${this.supervisor.host.disk_life_time}%
                  </span>
                </ha-settings-row>`
              : ""}
            ${metrics.map(
              (metric) =>
                html`
                  <supervisor-metric
                    .description=${metric.description}
                    .value=${metric.value ?? 0}
                    .tooltip=${metric.tooltip}
                  ></supervisor-metric>
                `
            )}
          </div>
        </div>
        <div class="card-actions">
          ${this.supervisor.host.features.includes("reboot")
            ? html`
                <ha-progress-button
                  title="Reboot the host OS"
                  class="warning"
                  @click=${this._hostReboot}
                >
                  Reboot Host
                </ha-progress-button>
              `
            : ""}
          ${this.supervisor.host.features.includes("shutdown")
            ? html`
                <ha-progress-button
                  title="Shutdown the host OS"
                  class="warning"
                  @click=${this._hostShutdown}
                >
                  Shutdown Host
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
            ${this.supervisor.host.features.includes("hassos")
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

  private _getUsedSpace = memoizeOne((used: number, total: number) =>
    roundWithOneDecimal(getValueInPercentage(used, 0, total))
  );

  private _primaryIpAddress = memoizeOne((network_info: NetworkInfo) => {
    if (!network_info || !network_info.interfaces) {
      return "";
    }
    return network_info.interfaces.find((a) => a.primary)?.ipv4?.address![0];
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
        title: "Failed to get hardware list",
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
      network: this.supervisor.network!,
      loadData: () => this._loadData(),
    });
  }

  private async _changeHostnameClicked(): Promise<void> {
    const curHostname: string = this.supervisor.host.hostname;
    const hostname = await showPromptDialog(this, {
      title: "Change Hostname",
      inputLabel: "Please enter a new hostname:",
      inputType: "string",
      defaultValue: curHostname,
    });

    if (hostname && hostname !== curHostname) {
      try {
        await changeHostOptions(this.hass, { hostname });
        const host = await fetchHassioHostInfo(this.hass);
        fireEvent(this, "supervisor-update", { host });
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
      const host = await fetchHassioHostInfo(this.hass);
      fireEvent(this, "supervisor-update", { host });
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to import from USB",
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _loadData(): Promise<void> {
    const network = await fetchNetworkInfo(this.hass);
    fireEvent(this, "supervisor-update", { network });
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
        .card-content {
          display: flex;
          flex-direction: column;
          height: calc(100% - 124px);
          justify-content: space-between;
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
