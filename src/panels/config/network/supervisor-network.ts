import "@material/mwc-button/mwc-button";
import { ActionDetail } from "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import { mdiDotsVertical } from "@mdi/js";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { cache } from "lit/directives/cache";
import "../../../components/ha-alert";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-circular-progress";
import "../../../components/ha-expansion-panel";
import "../../../components/ha-formfield";
import "../../../components/ha-header-bar";
import "../../../components/ha-icon-button";
import "../../../components/ha-radio";
import "../../../components/ha-related-items";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  AccessPoints,
  accesspointScan,
  fetchNetworkInfo,
  NetworkInterface,
  updateNetworkInterface,
  WifiConfiguration,
} from "../../../data/hassio/network";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { showIPDetailDialog } from "./show-ip-detail-dialog";

const IP_VERSIONS = ["ipv4", "ipv6"];

@customElement("supervisor-network")
export class HassioNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _accessPoints?: AccessPoints;

  @state() private _curTabIndex = 0;

  @state() private _dirty = false;

  @state() private _interface?: NetworkInterface;

  @state() private _interfaces!: NetworkInterface[];

  @state() private _processing = false;

  @state() private _scanning = false;

  @state() private _wifiConfiguration?: WifiConfiguration;

  protected firstUpdated() {
    this._fetchNetworkInfo();
  }

  private async _fetchNetworkInfo() {
    const network = await fetchNetworkInfo(this.hass);
    this._interfaces = network.interfaces.sort((a, b) =>
      a.primary > b.primary ? -1 : 1
    );
    this._interface = { ...this._interfaces[this._curTabIndex] };
  }

  protected render(): TemplateResult {
    if (!this._interface) {
      return html``;
    }

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize(
          "ui.panel.config.network.supervisor.title"
        )}
      >
        ${this._interfaces.length > 1
          ? html`<mwc-tab-bar
              .activeIndex=${this._curTabIndex}
              @MDCTabBar:activated=${this._handleTabActivated}
              >${this._interfaces.map(
                (device) =>
                  html`<mwc-tab
                    .id=${device.interface}
                    .label=${device.interface}
                  >
                  </mwc-tab>`
              )}
            </mwc-tab-bar>`
          : ""}
        ${cache(this._renderTab())}
      </ha-card>
    `;
  }

  private _renderTab() {
    return html`<div class="card-content">
        ${IP_VERSIONS.map((version) =>
          this._interface![version] ? this._renderIPConfiguration(version) : ""
        )}
        ${this._interface?.type === "wireless"
          ? html`
              <ha-expansion-panel header="Wi-Fi" outlined>
                ${this._interface?.wifi?.ssid
                  ? html`<p>
                      ${this.hass.localize(
                        "ui.panel.config.network.supervisor.connected_to",
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
                    : this.hass.localize(
                        "ui.panel.config.network.supervisor.scan_ap"
                      )}
                </mwc-button>
                ${this._accessPoints &&
                this._accessPoints.accesspoints &&
                this._accessPoints.accesspoints.length !== 0
                  ? html`
                      <mwc-list>
                        ${this._accessPoints.accesspoints
                          .filter((ap) => ap.ssid)
                          .map(
                            (ap) =>
                              html`
                                <mwc-list-item
                                  twoline
                                  @click=${this._selectAP}
                                  .activated=${ap.ssid ===
                                  this._wifiConfiguration?.ssid}
                                  .ap=${ap}
                                >
                                  <span>${ap.ssid}</span>
                                  <span slot="secondary">
                                    ${ap.mac} - Strength: ${ap.signal}
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
                          .label=${this.hass.localize(
                            "ui.panel.config.network.supervisor.open"
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
                          .label=${this.hass.localize(
                            "ui.panel.config.network.supervisor.wep"
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
                          .label=${this.hass.localize(
                            "ui.panel.config.network.supervisor.wpa"
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
                              label="Password"
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
              ${this.hass.localize(
                "ui.panel.config.network.supervisor.warning"
              )}
            </ha-alert>`
          : ""}
      </div>
      <div class="card-actions">
        <mwc-button @click=${this._updateNetwork} .disabled=${!this._dirty}>
          ${this._processing
            ? html`<ha-circular-progress active size="small">
              </ha-circular-progress>`
            : this.hass.localize("ui.common.save")}
        </mwc-button>
        <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
          <ha-icon-button
            slot="trigger"
            .label=${"ui.common.menu"}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <mwc-list-item>IP Information</mwc-list-item>
        </ha-button-menu>
      </div>`;
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        showIPDetailDialog(this, { interface: this._interface });
        break;
    }
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
            .label=${this.hass.localize(
              "ui.panel.config.network.supervisor.dhcp"
            )}
          >
            <ha-radio
              @change=${this._handleRadioValueChanged}
              .version=${version}
              value="auto"
              name="${version}method"
              .checked=${this._interface![version]?.method === "auto"}
            >
            </ha-radio>
          </ha-formfield>
          <ha-formfield
            .label=${this.hass.localize(
              "ui.panel.config.network.supervisor.static"
            )}
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
            .label=${this.hass.localize(
              "ui.panel.config.network.supervisor.disabled"
            )}
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
                .label=${this.hass.localize(
                  "ui.panel.config.network.supervisor.ip_netmask"
                )}
                .version=${version}
                .value=${this._toString(this._interface![version].address)}
                @value-changed=${this._handleInputValueChanged}
              >
              </paper-input>
              <paper-input
                class="flex-auto"
                id="gateway"
                .label=${this.hass.localize(
                  "ui.panel.config.network.supervisor.gateway"
                )}
                .version=${version}
                .value=${this._interface![version].gateway}
                @value-changed=${this._handleInputValueChanged}
              >
              </paper-input>
              <paper-input
                class="flex-auto"
                id="nameservers"
                .label=${this.hass.localize(
                  "ui.panel.config.network.supervisor.dns_servers"
                )}
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
      this._dirty = false;
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.network.supervisor.failed_to_change"
        ),
        text: extractApiErrorMessage(err),
      });
    } finally {
      this._processing = false;
    }
  }

  private async _handleTabActivated(ev: CustomEvent): Promise<void> {
    if (this._dirty) {
      const confirm = await showConfirmationDialog(this, {
        text: this.hass.localize("ui.panel.config.network.supervisor.unsaved"),
        confirmText: this.hass.localize("ui.common.yes"),
        dismissText: this.hass.localize("ui.common.no"),
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
      css`
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
        }

        mwc-tab-bar {
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
          margin-bottom: 24px;
        }

        .content {
          display: block;
          padding: 20px 24px;
        }

        mwc-button.warning {
          --mdc-theme-primary: var(--error-color);
        }

        mwc-button.scan {
          margin-left: 8px;
        }

        :host([rtl]) app-toolbar {
          direction: rtl;
          text-align: right;
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
        .card-actions {
          display: flex;
          flex-direction: row-reverse;
          justify-content: space-between;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-network": HassioNetwork;
  }
}
