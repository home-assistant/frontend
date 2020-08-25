import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button";
import "@material/mwc-tab-bar";
import "@material/mwc-tab";
import "@polymer/paper-input/paper-input";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { mdiClose } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  query,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { cache } from "lit-html/directives/cache";

import {
  updateNetworkInterface,
  NetworkInterface,
} from "../../../../src/data/hassio/network";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { HassioNetworkDialogParams } from "./show-dialog-network";
import { haStyleDialog } from "../../../../src/resources/styles";
import { showAlertDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../src/types";
import type { HaRadio } from "../../../../src/components/ha-radio";

import "../../../../src/components/ha-circular-progress";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-radio";
import "../../../../src/components/ha-related-items";
import "../../../../src/components/ha-svg-icon";

@customElement("dialog-hassio-network")
export class DialogHassioNetwork extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _prosessing: boolean = false;

  @internalProperty() private _params?: HassioNetworkDialogParams;

  @internalProperty() private _network!: {
    interface: string;
    data: NetworkInterface;
  }[];

  @internalProperty() private _curTabIndex: number = 0;

  @query("#ip_address") private _ip_address?: PaperInputElement;

  @query("#gateway") private _gateway?: PaperInputElement;

  @query("#nameservers") private _nameservers?: PaperInputElement;

  public async showDialog(params: HassioNetworkDialogParams): Promise<void> {
    this._params = params;
    this._network = Object.keys(params.network?.interfaces)
      .map((device) => ({
        interface: device,
        data: params.network.interfaces[device],
      }))
      .sort((a, b) => {
        return a.data.primary > b.data.primary ? -1 : 1;
      });
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._prosessing = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params || !this._network) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        .heading=${true}
        hideActions
        @closed=${this.closeDialog}
        @close-dialog=${this.closeDialog}
      >
        <div slot="heading">
          <ha-header-bar>
            <mwc-icon-button slot="navigationIcon" dialogAction="cancel">
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </mwc-icon-button>
            <span slot="title">
              Network settings
            </span>
          </ha-header-bar>
          ${this._network.length > 1
            ? html` <mwc-tab-bar
                .activeIndex=${this._curTabIndex}
                @MDCTabBar:activated=${this._handleTabActivated}
                >${this._network.map(
                  (device) =>
                    html`<mwc-tab
                      .id=${device.interface}
                      .label=${device.interface}
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
    const device = this._network[this._curTabIndex];
    return html` <div class="form container">
        <ha-formfield label="DHCP">
          <ha-radio
            @change=${this._handleRadioValueChanged}
            value="dhcp"
            name="method"
            ?checked=${device.data.method === "dhcp"}
          >
          </ha-radio>
        </ha-formfield>
        <ha-formfield label="Static">
          <ha-radio
            @change=${this._handleRadioValueChanged}
            value="static"
            name="method"
            ?checked=${device.data.method === "static"}
          >
          </ha-radio>
        </ha-formfield>
        ${device.data.method !== "dhcp"
          ? html` <paper-input
                class="flex-auto"
                id="ip_address"
                label="IP address/Netmask"
                .value="${device.data.ip_address}"
              ></paper-input>
              <paper-input
                class="flex-auto"
                id="gateway"
                label="Gateway address"
                .value="${device.data.gateway}"
              ></paper-input>
              <paper-input
                class="flex-auto"
                id="nameservers"
                label="DNS servers"
                .value="${device.data.nameservers.join(", ")}"
              ></paper-input>
              NB!: If you are changing IP or gateway addresses, you might lose
              the connection.`
          : ""}
      </div>
      <div class="buttons">
        <mwc-button label="close" @click=${this.closeDialog}> </mwc-button>
        <mwc-button @click=${this._updateNetwork}>
          ${this._prosessing
            ? html`<ha-circular-progress active></ha-circular-progress>`
            : "Update"}
        </mwc-button>
      </div>`;
  }

  static get styles(): CSSResult[] {
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

        :host([rtl]) app-toolbar {
          direction: rtl;
          text-align: right;
        }
        .container {
          padding: 20px 24px;
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
      `,
    ];
  }

  private async _updateNetwork() {
    this._prosessing = true;
    const device = this._network[this._curTabIndex];
    let options: Partial<NetworkInterface> = {
      method: device.data.method,
    };
    if (options.method !== "dhcp") {
      options = {
        ...options,
        address: this._ip_address!.value!,
        gateway: this._gateway!.value!,
        dns: String(this._nameservers!.value!).split(","),
      };
    }
    try {
      await updateNetworkInterface(this.hass, device.interface, options);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to change network settings",
        text:
          typeof err === "object" ? err.body.message || "Unkown error" : err,
      });
      this._prosessing = false;
      return;
    }
    this._params?.loadData();
    this.closeDialog();
  }

  private _handleTabActivated(ev: CustomEvent): void {
    this._curTabIndex = ev.detail.index;
  }

  private _handleRadioValueChanged(ev: CustomEvent): void {
    this._network[this._curTabIndex].data.method = (ev.target as HaRadio)
      .value as "dhcp" | "static";
    this.requestUpdate("_network");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-network": DialogHassioNetwork;
  }
}
