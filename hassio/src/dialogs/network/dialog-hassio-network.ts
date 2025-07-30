import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-expansion-panel";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-icon-button";
import "../../../../src/components/ha-list";
import "../../../../src/components/ha-list-item";
import "../../../../src/components/ha-password-field";
import "../../../../src/components/ha-radio";
import "../../../../src/components/ha-textfield";
import type { HaTextField } from "../../../../src/components/ha-textfield";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import type {
  AccessPoints,
  NetworkInterface,
  WifiConfiguration,
} from "../../../../src/data/hassio/network";
import {
  accesspointScan,
  updateNetworkInterface,
} from "../../../../src/data/hassio/network";
import type { Supervisor } from "../../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../../src/dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import type { HassioNetworkDialogParams } from "./show-dialog-network";
import "../../../../src/components/sl-tab-group";

const IP_VERSIONS = ["ipv4", "ipv6"];

@customElement("dialog-hassio-network")
export class DialogHassioNetwork
  extends LitElement
  implements HassDialog<HassioNetworkDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @state() private _accessPoints?: AccessPoints;

  @state() private _curTabIndex = 0;

  @state() private _dirty = false;

  @state() private _interface?: NetworkInterface;

  @state() private _interfaces!: NetworkInterface[];

  @state() private _params?: HassioNetworkDialogParams;

  @state() private _processing = false;

  @state() private _scanning = false;

  @state() private _wifiConfiguration?: WifiConfiguration;

  public async showDialog(params: HassioNetworkDialogParams): Promise<void> {
    this._params = params;
    this._dirty = false;
    this._curTabIndex = 0;
    this.supervisor = params.supervisor;
    this._interfaces = params.supervisor.network.interfaces.sort((a, b) =>
      a.primary > b.primary ? -1 : 1
    );
    this._interface = { ...this._interfaces[this._curTabIndex] };

    await this.updateComplete;
  }

  public closeDialog() {
    this._params = undefined;
    this._processing = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render() {
    if (!this._params || !this._interface) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${this.supervisor.localize("dialog.network.title")}
        hideActions
        @closed=${this.closeDialog}
      >
        <div slot="heading">
          <ha-header-bar>
            <span slot="title">
              ${this.supervisor.localize("dialog.network.title")}
            </span>
            <ha-icon-button
              .label=${this.supervisor.localize("common.close")}
              .path=${mdiClose}
              slot="actionItems"
              dialogAction="cancel"
            ></ha-icon-button>
          </ha-header-bar>
          ${this._interfaces.length > 1
            ? html`<sl-tab-group @sl-tab-show=${this._handleTabActivated}
                >${this._interfaces.map(
                  (device, index) =>
                    html`<sl-tab
                      slot="nav"
                      .id=${device.interface}
                      .panel=${index.toString()}
                      .active=${this._curTabIndex === index}
                    >
                      ${device.interface}
                    </sl-tab>`
                )}
              </sl-tab-group>`
            : ""}
        </div>
        ${cache(this._renderTab())}
      </ha-dialog>
    `;
  }

  private _renderTab() {
    return html` <div class="form container">
        ${IP_VERSIONS.map((version) =>
          this._interface![version] ? this._renderIPConfiguration(version) : ""
        )}
        ${this._interface?.type === "wireless"
          ? html`
              <ha-expansion-panel
                .header=${this.supervisor.localize("dialog.network.wifi")}
                outlined
              >
                ${this._interface?.wifi?.ssid
                  ? html`<p>
                      ${this.supervisor.localize(
                        "dialog.network.connected_to",
                        { ssid: this._interface?.wifi?.ssid }
                      )}
                    </p>`
                  : ""}
                <ha-button
                  appearance="plain"
                  size="small"
                  class="scan"
                  @click=${this._scanForAP}
                  .disabled=${this._scanning}
                  .loading=${this._scanning}
                >
                  ${this.supervisor.localize("dialog.network.scan_ap")}
                </ha-button>
                ${this._accessPoints &&
                this._accessPoints.accesspoints &&
                this._accessPoints.accesspoints.length !== 0
                  ? html`
                      <ha-list>
                        ${this._accessPoints.accesspoints
                          .filter((ap) => ap.ssid)
                          .map(
                            (ap) => html`
                              <ha-list-item
                                twoline
                                @click=${this._selectAP}
                                .activated=${ap.ssid ===
                                this._wifiConfiguration?.ssid}
                                .ap=${ap}
                              >
                                <span>${ap.ssid}</span>
                                <span slot="secondary">
                                  ${ap.mac} -
                                  ${this.supervisor.localize(
                                    "dialog.network.signal_strength"
                                  )}:
                                  ${ap.signal}
                                </span>
                              </ha-list-item>
                            `
                          )}
                      </ha-list>
                    `
                  : ""}
                ${this._wifiConfiguration
                  ? html`
                      <div class="radio-row">
                        <ha-formfield
                          .label=${this.supervisor.localize(
                            "dialog.network.open"
                          )}
                        >
                          <ha-radio
                            @change=${this._handleRadioValueChangedAp}
                            .ap=${this._wifiConfiguration}
                            value="open"
                            name="auth"
                            .checked=${this._wifiConfiguration.auth ===
                              undefined ||
                            this._wifiConfiguration.auth === "open"}
                          >
                          </ha-radio>
                        </ha-formfield>
                        <ha-formfield
                          .label=${this.supervisor.localize(
                            "dialog.network.wep"
                          )}
                        >
                          <ha-radio
                            @change=${this._handleRadioValueChangedAp}
                            .ap=${this._wifiConfiguration}
                            value="wep"
                            name="auth"
                            .checked=${this._wifiConfiguration.auth === "wep"}
                          >
                          </ha-radio>
                        </ha-formfield>
                        <ha-formfield
                          .label=${this.supervisor.localize(
                            "dialog.network.wpa"
                          )}
                        >
                          <ha-radio
                            @change=${this._handleRadioValueChangedAp}
                            .ap=${this._wifiConfiguration}
                            value="wpa-psk"
                            name="auth"
                            .checked=${this._wifiConfiguration.auth ===
                            "wpa-psk"}
                          >
                          </ha-radio>
                        </ha-formfield>
                      </div>
                      ${this._wifiConfiguration.auth === "wpa-psk" ||
                      this._wifiConfiguration.auth === "wep"
                        ? html`
                            <ha-password-field
                              class="flex-auto"
                              id="psk"
                              .label=${this.supervisor.localize(
                                "dialog.network.wifi_password"
                              )}
                              version="wifi"
                              @change=${this._handleInputValueChangedWifi}
                            >
                            </ha-password-field>
                          `
                        : ""}
                    `
                  : ""}
              </ha-expansion-panel>
            `
          : ""}
        ${this._dirty
          ? html`<ha-alert alert-type="warning">
              ${this.supervisor.localize("dialog.network.warning")}
            </ha-alert>`
          : ""}
      </div>
      <div class="buttons">
        <ha-button @click=${this.closeDialog} appearance="plain">
          ${this.supervisor.localize("common.cancel")}
        </ha-button>
        <ha-button
          @click=${this._updateNetwork}
          .disabled=${!this._dirty}
          .loading=${this._processing}
        >
          ${this.supervisor.localize("common.save")}
        </ha-button>
      </div>`;
  }

  private _selectAP(event) {
    this._wifiConfiguration = event.currentTarget.ap;
    this._dirty = true;
  }

  private async _scanForAP() {
    if (!this._interface) {
      return;
    }
    this._scanning = true;
    try {
      this._accessPoints = await accesspointScan(
        this.hass,
        this._interface.interface
      );
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Failed to scan for accesspoints",
        text: extractApiErrorMessage(err),
      });
    } finally {
      this._scanning = false;
    }
  }

  private _renderIPConfiguration(version: string) {
    return html`
      <ha-expansion-panel
        .header=${`IPv${version.charAt(version.length - 1)}`}
        outlined
      >
        <div class="radio-row">
          <ha-formfield
            .label=${this.supervisor.localize("dialog.network.auto")}
          >
            <ha-radio
              @change=${this._handleRadioValueChanged}
              .version=${version}
              value="auto"
              name="${version}method"
              .checked=${this._interface![version]?.method === "auto"}
              dialogInitialFocus
            >
            </ha-radio>
          </ha-formfield>
          <ha-formfield
            .label=${this.supervisor.localize("dialog.network.static")}
          >
            <ha-radio
              @change=${this._handleRadioValueChanged}
              .version=${version}
              value="static"
              name="${version}method"
              .checked=${this._interface![version]?.method === "static"}
            >
            </ha-radio>
          </ha-formfield>
          <ha-formfield
            .label=${this.supervisor.localize("dialog.network.disabled")}
            class="warning"
          >
            <ha-radio
              @change=${this._handleRadioValueChanged}
              .version=${version}
              value="disabled"
              name="${version}method"
              .checked=${this._interface![version]?.method === "disabled"}
            >
            </ha-radio>
          </ha-formfield>
        </div>
        ${this._interface![version].method === "static"
          ? html`
              <ha-textfield
                class="flex-auto"
                id="address"
                .label=${this.supervisor.localize("dialog.network.ip_netmask")}
                .version=${version}
                .value=${this._toString(this._interface![version].address)}
                @change=${this._handleInputValueChanged}
              >
              </ha-textfield>
              <ha-textfield
                class="flex-auto"
                id="gateway"
                .label=${this.supervisor.localize("dialog.network.gateway")}
                .version=${version}
                .value=${this._interface![version].gateway}
                @change=${this._handleInputValueChanged}
              >
              </ha-textfield>
              <ha-textfield
                class="flex-auto"
                id="nameservers"
                .label=${this.supervisor.localize("dialog.network.dns_servers")}
                .version=${version}
                .value=${this._toString(this._interface![version].nameservers)}
                @change=${this._handleInputValueChanged}
              >
              </ha-textfield>
            `
          : ""}
      </ha-expansion-panel>
    `;
  }

  private _toArray(data: string | string[]): string[] {
    if (Array.isArray(data)) {
      if (data && typeof data[0] === "string") {
        data = data[0];
      }
    }
    if (!data) {
      return [];
    }
    if (typeof data === "string") {
      return data.replace(/ /g, "").split(",");
    }
    return data;
  }

  private _toString(data: string | string[]): string {
    if (!data) {
      return "";
    }
    if (Array.isArray(data)) {
      return data.join(", ");
    }
    return data;
  }

  private async _updateNetwork() {
    this._processing = true;
    let interfaceOptions: Partial<NetworkInterface> = {};

    IP_VERSIONS.forEach((version) => {
      interfaceOptions[version] = {
        method: this._interface![version]?.method || "auto",
      };
      if (this._interface![version]?.method === "static") {
        interfaceOptions[version] = {
          ...interfaceOptions[version],
          address: this._toArray(this._interface![version]?.address),
          gateway: this._interface![version]?.gateway,
          nameservers: this._toArray(this._interface![version]?.nameservers),
        };
      }
    });

    if (this._wifiConfiguration) {
      interfaceOptions = {
        ...interfaceOptions,
        wifi: {
          ssid: this._wifiConfiguration.ssid,
          mode: this._wifiConfiguration.mode,
          auth: this._wifiConfiguration.auth || "open",
        },
      };
      if (interfaceOptions.wifi!.auth !== "open") {
        interfaceOptions.wifi = {
          ...interfaceOptions.wifi,
          psk: this._wifiConfiguration.psk,
        };
      }
    }

    interfaceOptions.enabled =
      this._wifiConfiguration !== undefined ||
      interfaceOptions.ipv4?.method !== "disabled" ||
      interfaceOptions.ipv6?.method !== "disabled";

    try {
      await updateNetworkInterface(
        this.hass,
        this._interface!.interface,
        interfaceOptions
      );
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize("dialog.network.failed_to_change"),
        text: extractApiErrorMessage(err),
      });
      this._processing = false;
      return;
    }
    this._params?.loadData();
    this.closeDialog();
  }

  private async _handleTabActivated(ev: CustomEvent): Promise<void> {
    if (this._dirty) {
      const confirm = await showConfirmationDialog(this, {
        text: this.supervisor.localize("dialog.network.unsaved"),
        confirmText: this.supervisor.localize("common.yes"),
        dismissText: this.supervisor.localize("common.no"),
      });
      if (!confirm) {
        this.requestUpdate("_interface");
        return;
      }
    }
    this._curTabIndex = Number(ev.detail.name);
    this._interface = { ...this._interfaces[this._curTabIndex] };
  }

  private _handleRadioValueChanged(ev: CustomEvent): void {
    const value = (ev.target as any).value as "disabled" | "auto" | "static";
    const version = (ev.target as any).version as "ipv4" | "ipv6";

    if (
      !value ||
      !this._interface ||
      this._interface[version]!.method === value
    ) {
      return;
    }
    this._dirty = true;

    this._interface[version]!.method = value;
    this.requestUpdate("_interface");
  }

  private _handleRadioValueChangedAp(ev: CustomEvent): void {
    const value = (ev.target as any).value as string as
      | "open"
      | "wep"
      | "wpa-psk";
    this._wifiConfiguration!.auth = value;
    this._dirty = true;
    this.requestUpdate("_wifiConfiguration");
  }

  private _handleInputValueChanged(ev: Event): void {
    const source = ev.target as HaTextField;
    const value = source.value;
    const version = (ev.target as any).version as "ipv4" | "ipv6";
    const id = source.id;

    if (
      !value ||
      !this._interface ||
      this._toString(this._interface[version]![id]) === this._toString(value)
    ) {
      return;
    }

    this._dirty = true;
    this._interface[version]![id] = value;
  }

  private _handleInputValueChangedWifi(ev: Event): void {
    const source = ev.target as HaTextField;
    const value = source.value;
    const id = source.id;

    if (
      !value ||
      !this._wifiConfiguration ||
      this._wifiConfiguration![id] === value
    ) {
      return;
    }
    this._dirty = true;
    this._wifiConfiguration![id] = value;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
        }

        ha-dialog {
          --dialog-content-position: static;
          --dialog-content-padding: 0;
          --dialog-z-index: 6;
        }

        @media all and (min-width: 451px) and (min-height: 501px) {
          .container {
            width: 400px;
          }
        }

        .content {
          display: block;
          padding: 20px 24px;
        }

        /* overrule the ha-style-dialog max-height on small screens */
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-header-bar {
            --mdc-theme-primary: var(--app-header-background-color);
            --mdc-theme-on-primary: var(--app-header-text-color, white);
          }
        }

        ha-button.scan {
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
        }

        .container {
          padding: 0 8px 4px;
        }
        .form {
          margin-bottom: 53px;
        }
        .buttons {
          position: absolute;
          bottom: 0;
          width: 100%;
          box-sizing: border-box;
          border-top: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
          display: flex;
          justify-content: space-between;
          padding: 8px;
          padding-bottom: max(var(--safe-area-inset-bottom), 8px);
          background-color: var(--mdc-theme-surface, #fff);
        }
        .warning {
          color: var(--error-color);
          --primary-color: var(--error-color);
        }
        div.warning {
          margin: 12px 4px -12px;
        }

        ha-expansion-panel {
          --expansion-panel-summary-padding: 0 16px;
          margin: 4px 0;
        }
        ha-textfield {
          padding: 0 14px;
        }
        ha-list-item {
          --mdc-list-side-padding: 10px;
        }

        sl-tab {
          flex: 1;
        }
        sl-tab::part(base) {
          width: 100%;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-network": DialogHassioNetwork;
  }
}
