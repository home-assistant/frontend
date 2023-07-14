import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import { mdiClose } from "@mdi/js";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-circular-progress";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-expansion-panel";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-icon-button";
import "../../../../src/components/ha-radio";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import {
  AccessPoints,
  accesspointScan,
  NetworkInterface,
  updateNetworkInterface,
  WifiConfiguration,
} from "../../../../src/data/hassio/network";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import { HassDialog } from "../../../../src/dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { HassioNetworkDialogParams } from "./show-dialog-network";

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

  public closeDialog(): void {
    this._params = undefined;
    this._processing = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
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
            ? html`<mwc-tab-bar
                .activeIndex=${this._curTabIndex}
                @MDCTabBar:activated=${this._handleTabActivated}
                >${this._interfaces.map(
                  (device) =>
                    html`<mwc-tab
                      .id=${device.interface}
                      .label=${device.interface}
                      dialogInitialFocus
                    >
                    </mwc-tab>`
                )}
              </mwc-tab-bar>`
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
                        "ssid",
                        this._interface?.wifi?.ssid
                      )}
                    </p>`
                  : ""}
                <mwc-button
                  class="scan"
                  @click=${this._scanForAP}
                  .disabled=${this._scanning}
                >
                  ${this._scanning
                    ? html`<ha-circular-progress active size="small">
                      </ha-circular-progress>`
                    : this.supervisor.localize("dialog.network.scan_ap")}
                </mwc-button>
                ${this._accessPoints &&
                this._accessPoints.accesspoints &&
                this._accessPoints.accesspoints.length !== 0
                  ? html`
                      <mwc-list>
                        ${this._accessPoints.accesspoints
                          .filter((ap) => ap.ssid)
                          .map(
                            (ap) => html`
                              <mwc-list-item
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
                              </mwc-list-item>
                            `
                          )}
                      </mwc-list>
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
                            <paper-input
                              class="flex-auto"
                              type="password"
                              id="psk"
                              .label=${this.supervisor.localize(
                                "dialog.network.wifi_password"
                              )}
                              version="wifi"
                              @value-changed=${this
                                ._handleInputValueChangedWifi}
                            >
                            </paper-input>
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
        <mwc-button
          .label=${this.supervisor.localize("common.cancel")}
          @click=${this.closeDialog}
        >
        </mwc-button>
        <mwc-button @click=${this._updateNetwork} .disabled=${!this._dirty}>
          ${this._processing
            ? html`<ha-circular-progress active size="small">
              </ha-circular-progress>`
            : this.supervisor.localize("common.save")}
        </mwc-button>
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
              <paper-input
                class="flex-auto"
                id="address"
                .label=${this.supervisor.localize("dialog.network.ip_netmask")}
                .version=${version}
                .value=${this._toString(this._interface![version].address)}
                @value-changed=${this._handleInputValueChanged}
              >
              </paper-input>
              <paper-input
                class="flex-auto"
                id="gateway"
                .label=${this.supervisor.localize("dialog.network.gateway")}
                .version=${version}
                .value=${this._interface![version].gateway}
                @value-changed=${this._handleInputValueChanged}
              >
              </paper-input>
              <paper-input
                class="flex-auto"
                id="nameservers"
                .label=${this.supervisor.localize("dialog.network.dns_servers")}
                .version=${version}
                .value=${this._toString(this._interface![version].nameservers)}
                @value-changed=${this._handleInputValueChanged}
              >
              </paper-input>
            `
          : ""}
      </ha-expansion-panel>
    `;
  }

  _toArray(data: string | string[]): string[] {
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

  _toString(data: string | string[]): string {
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
    this._curTabIndex = ev.detail.index;
    this._interface = { ...this._interfaces[ev.detail.index] };
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

  private _handleInputValueChanged(ev: CustomEvent): void {
    const value: string | null | undefined = (ev.target as PaperInputElement)
      .value;
    const version = (ev.target as any).version as "ipv4" | "ipv6";
    const id = (ev.target as PaperInputElement).id;

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

  private _handleInputValueChangedWifi(ev: CustomEvent): void {
    const value: string | null | undefined = (ev.target as PaperInputElement)
      .value;
    const id = (ev.target as PaperInputElement).id;

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

        mwc-tab-bar {
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
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

        mwc-button.warning {
          --mdc-theme-primary: var(--error-color);
        }

        mwc-button.scan {
          margin-left: 8px;
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
          padding-bottom: max(env(safe-area-inset-bottom), 8px);
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
        paper-input {
          padding: 0 14px;
        }
        mwc-list-item {
          --mdc-list-side-padding: 10px;
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
