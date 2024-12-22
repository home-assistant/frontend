import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-card";
import "../../../src/components/ha-icon-button";
import "../../../src/components/ha-settings-row";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../src/data/hassio/common";
import { fetchHassioHardwareInfo } from "../../../src/data/hassio/hardware";
import {
  changeHostOptions,
  configSyncOS,
  rebootHost,
  shutdownHost,
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
import { showHassioDatadiskDialog } from "../dialogs/datadisk/show-dialog-hassio-datadisk";
import { showHassioHardwareDialog } from "../dialogs/hardware/show-dialog-hassio-hardware";
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
        description: this.supervisor.localize("system.host.used_space"),
        value: this._getUsedSpace(
          this.supervisor.host.disk_used,
          this.supervisor.host.disk_total
        ),
        tooltip: `${this.supervisor.host.disk_used} GB/${this.supervisor.host.disk_total} GB`,
      },
    ];
    return html`
      <ha-card header="Host" outlined>
        <div class="card-content">
          <div>
            ${this.supervisor.host.features.includes("hostname")
              ? html`<ha-settings-row>
                  <span slot="heading">
                    ${this.supervisor.localize("system.host.hostname")}
                  </span>
                  <span slot="description">
                    ${this.supervisor.host.hostname}
                  </span>
                  <mwc-button
                    .label=${this.supervisor.localize("system.host.change")}
                    @click=${this._changeHostnameClicked}
                  >
                  </mwc-button>
                </ha-settings-row>`
              : ""}
            ${this.supervisor.host.features.includes("network")
              ? html` <ha-settings-row>
                  <span slot="heading">
                    ${this.supervisor.localize("system.host.ip_address")}
                  </span>
                  <span slot="description"> ${primaryIpAddress} </span>
                  <mwc-button
                    .label=${this.supervisor.localize("system.host.change")}
                    @click=${this._changeNetworkClicked}
                  >
                  </mwc-button>
                </ha-settings-row>`
              : ""}

            <ha-settings-row>
              <span slot="heading">
                ${this.supervisor.localize("system.host.operating_system")}
              </span>
              <span slot="description">
                ${this.supervisor.host.operating_system}
              </span>
              ${!atLeastVersion(this.hass.config.version, 2021, 12) &&
              this.supervisor.os.update_available
                ? html`
                    <a href="/hassio/update-available/os">
                      <mwc-button
                        .label=${this.supervisor.localize("common.show")}
                      >
                      </mwc-button>
                    </a>
                  `
                : ""}
            </ha-settings-row>
            ${!this.supervisor.host.features.includes("haos")
              ? html`<ha-settings-row>
                  <span slot="heading">
                    ${this.supervisor.localize("system.host.docker_version")}
                  </span>
                  <span slot="description">
                    ${this.supervisor.info.docker}
                  </span>
                </ha-settings-row>`
              : ""}
            ${this.supervisor.host.deployment
              ? html`<ha-settings-row>
                  <span slot="heading">
                    ${this.supervisor.localize("system.host.deployment")}
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
                    ${this.supervisor.localize(
                      "system.host.emmc_lifetime_used"
                    )}
                  </span>
                  <span slot="description">
                    ${this.supervisor.host.disk_life_time - 10} % -
                    ${this.supervisor.host.disk_life_time} %
                  </span>
                </ha-settings-row>`
              : ""}
            ${metrics.map(
              (metric) => html`
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
                <ha-progress-button class="warning" @click=${this._hostReboot}>
                  ${this.supervisor.localize("system.host.reboot_host")}
                </ha-progress-button>
              `
            : ""}
          ${this.supervisor.host.features.includes("shutdown")
            ? html`
                <ha-progress-button
                  class="warning"
                  @click=${this._hostShutdown}
                >
                  ${this.supervisor.localize("system.host.shutdown_host")}
                </ha-progress-button>
              `
            : ""}

          <ha-button-menu>
            <ha-icon-button
              .label=${this.supervisor.localize("common.menu")}
              .path=${mdiDotsVertical}
              slot="trigger"
            ></ha-icon-button>
            <mwc-list-item
              .action=${"hardware"}
              @click=${this._handleMenuAction}
            >
              ${this.supervisor.localize("system.host.hardware")}
            </mwc-list-item>
            ${this.supervisor.host.features.includes("haos")
              ? html`
                  <mwc-list-item
                    .action=${"import_from_usb"}
                    @click=${this._handleMenuAction}
                  >
                    ${this.supervisor.localize("system.host.import_from_usb")}
                  </mwc-list-item>
                  ${this.supervisor.host.features.includes("os_agent") &&
                  atLeastVersion(this.supervisor.host.agent_version, 1, 2, 0)
                    ? html`
                        <mwc-list-item
                          .action=${"move_datadisk"}
                          @click=${this._handleMenuAction}
                        >
                          ${this.supervisor.localize(
                            "system.host.move_datadisk"
                          )}
                        </mwc-list-item>
                      `
                    : ""}
                `
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

  private async _handleMenuAction(ev) {
    switch ((ev.target as any).action) {
      case "hardware":
        await this._showHardware();
        break;
      case "import_from_usb":
        await this._importFromUSB();
        break;
      case "move_datadisk":
        await this._moveDatadisk();
        break;
    }
  }

  private _moveDatadisk(): void {
    showHassioDatadiskDialog(this, {
      supervisor: this.supervisor,
    });
  }

  private async _showHardware(): Promise<void> {
    let hardware;
    try {
      hardware = await fetchHassioHardwareInfo(this.hass);
    } catch (err: any) {
      await showAlertDialog(this, {
        title: this.supervisor.localize(
          "system.host.failed_to_get_hardware_list"
        ),
        text: extractApiErrorMessage(err),
      });
      return;
    }
    showHassioHardwareDialog(this, { supervisor: this.supervisor, hardware });
  }

  private async _hostReboot(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: this.supervisor.localize("system.host.reboot_host"),
      text: this.supervisor.localize("system.host.confirm_reboot"),
      confirmText: this.supervisor.localize("system.host.reboot_host"),
      dismissText: this.supervisor.localize("common.cancel"),
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await rebootHost(this.hass);
    } catch (err: any) {
      // Ignore connection errors, these are all expected
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        showAlertDialog(this, {
          title: this.supervisor.localize("system.host.failed_to_reboot"),
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
      title: this.supervisor.localize("system.host.shutdown_host"),
      text: this.supervisor.localize("system.host.confirm_shutdown"),
      confirmText: this.supervisor.localize("system.host.shutdown_host"),
      dismissText: this.supervisor.localize("common.cancel"),
    });

    if (!confirmed) {
      button.progress = false;
      return;
    }

    try {
      await shutdownHost(this.hass);
    } catch (err: any) {
      // Ignore connection errors, these are all expected
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        showAlertDialog(this, {
          title: this.supervisor.localize("system.host.failed_to_shutdown"),
          text: extractApiErrorMessage(err),
        });
      }
    }
    button.progress = false;
  }

  private async _changeNetworkClicked(): Promise<void> {
    showNetworkDialog(this, {
      supervisor: this.supervisor,
      loadData: () => this._loadData(),
    });
  }

  private async _changeHostnameClicked(): Promise<void> {
    const curHostname: string = this.supervisor.host.hostname;
    const hostname = await showPromptDialog(this, {
      title: this.supervisor.localize("system.host.change_hostname"),
      inputLabel: this.supervisor.localize("system.host.new_hostname"),
      inputType: "string",
      defaultValue: curHostname,
      confirmText: this.supervisor.localize("common.update"),
    });

    if (hostname && hostname !== curHostname) {
      try {
        await changeHostOptions(this.hass, { hostname });
        fireEvent(this, "supervisor-collection-refresh", {
          collection: "host",
        });
      } catch (err: any) {
        showAlertDialog(this, {
          title: this.supervisor.localize("system.host.failed_to_set_hostname"),
          text: extractApiErrorMessage(err),
        });
      }
    }
  }

  private async _importFromUSB(): Promise<void> {
    try {
      await configSyncOS(this.hass);
      fireEvent(this, "supervisor-collection-refresh", {
        collection: "host",
      });
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize(
          "system.host.failed_to_import_from_usb"
        ),
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _loadData(): Promise<void> {
    if (atLeastVersion(this.hass.config.version, 2021, 2, 4)) {
      fireEvent(this, "supervisor-collection-refresh", {
        collection: "network",
      });
    } else {
      const network = await fetchNetworkInfo(this.hass);
      fireEvent(this, "supervisor-update", { network });
    }
  }

  static get styles(): CSSResultGroup {
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
        mwc-list-item ha-svg-icon {
          color: var(--secondary-text-color);
        }
        a {
          text-decoration: none;
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
