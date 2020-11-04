import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import { mdiClose } from "@mdi/js";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
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
import { cache } from "lit-html/directives/cache";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-circular-progress";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-header-bar";
import "../../../../src/components/ha-radio";
import type { HaRadio } from "../../../../src/components/ha-radio";
import "../../../../src/components/ha-related-items";
import "../../../../src/components/ha-svg-icon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import {
  NetworkInterface,
  updateNetworkInterface,
} from "../../../../src/data/hassio/network";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import { HassDialog } from "../../../../src/dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { HassioNetworkDialogParams } from "./show-dialog-network";

@customElement("dialog-hassio-network")
export class DialogHassioNetwork extends LitElement
  implements HassDialog<HassioNetworkDialogParams> {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _prosessing = false;

  @internalProperty() private _params?: HassioNetworkDialogParams;

  @internalProperty() private _network!: {
    interface: string;
    data: NetworkInterface;
  }[];

  @internalProperty() private _curTabIndex = 0;

  @internalProperty() private _device?: {
    interface: string;
    data: NetworkInterface;
  };

  @internalProperty() private _dirty = false;

  public async showDialog(params: HassioNetworkDialogParams): Promise<void> {
    this._params = params;
    this._dirty = false;
    this._curTabIndex = 0;
    this._network = Object.keys(params.network?.interfaces)
      .map((device) => ({
        interface: device,
        data: params.network.interfaces[device],
      }))
      .sort((a, b) => {
        return a.data.primary > b.data.primary ? -1 : 1;
      });
    this._device = this._network[this._curTabIndex];
    this._device.data.nameservers = String(this._device.data.nameservers);
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
        scrimClickAction
        escapeKeyAction
        .heading=${true}
        hideActions
        @closed=${this.closeDialog}
      >
        <div slot="heading">
          <ha-header-bar>
            <span slot="title">
              Network settings
            </span>
            <mwc-icon-button slot="actionItems" dialogAction="cancel">
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </mwc-icon-button>
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
    return html` <div class="form container">
        <ha-formfield label="DHCP">
          <ha-radio
            @change=${this._handleRadioValueChanged}
            value="dhcp"
            name="method"
            ?checked=${this._device!.data.method === "dhcp"}
          >
          </ha-radio>
        </ha-formfield>
        <ha-formfield label="Static">
          <ha-radio
            @change=${this._handleRadioValueChanged}
            value="static"
            name="method"
            ?checked=${this._device!.data.method === "static"}
          >
          </ha-radio>
        </ha-formfield>
        ${this._device!.data.method !== "dhcp"
          ? html` <paper-input
                class="flex-auto"
                id="ip_address"
                label="IP address/Netmask"
                .value="${this._device!.data.ip_address}"
                @value-changed=${this._handleInputValueChanged}
              ></paper-input>
              <paper-input
                class="flex-auto"
                id="gateway"
                label="Gateway address"
                .value="${this._device!.data.gateway}"
                @value-changed=${this._handleInputValueChanged}
              ></paper-input>
              <paper-input
                class="flex-auto"
                id="nameservers"
                label="DNS servers"
                .value="${this._device!.data.nameservers as string}"
                @value-changed=${this._handleInputValueChanged}
              ></paper-input>
              NB!: If you are changing IP or gateway addresses, you might lose
              the connection.`
          : ""}
      </div>
      <div class="buttons">
        <mwc-button label="close" @click=${this.closeDialog}> </mwc-button>
        <mwc-button @click=${this._updateNetwork} ?disabled=${!this._dirty}>
          ${this._prosessing
            ? html`<ha-circular-progress active></ha-circular-progress>`
            : "Update"}
        </mwc-button>
      </div>`;
  }

  private async _updateNetwork() {
    this._prosessing = true;
    let options: Partial<NetworkInterface> = {
      method: this._device!.data.method,
    };
    if (options.method !== "dhcp") {
      options = {
        ...options,
        address: this._device!.data.ip_address,
        gateway: this._device!.data.gateway,
        dns: String(this._device!.data.nameservers).split(","),
      };
    }
    try {
      await updateNetworkInterface(this.hass, this._device!.interface, options);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to change network settings",
        text: extractApiErrorMessage(err),
      });
      this._prosessing = false;
      return;
    }
    this._params?.loadData();
    this.closeDialog();
  }

  private async _handleTabActivated(ev: CustomEvent): Promise<void> {
    if (this._dirty) {
      const confirm = await showConfirmationDialog(this, {
        text:
          "You have unsaved changes, these will get lost if you change tabs, do you want to continue?",
        confirmText: "yes",
        dismissText: "no",
      });
      if (!confirm) {
        this.requestUpdate("_device");
        return;
      }
    }
    this._curTabIndex = ev.detail.index;
    this._device = this._network[ev.detail.index];
    this._device.data.nameservers = String(this._device.data.nameservers);
  }

  private _handleRadioValueChanged(ev: CustomEvent): void {
    const value = (ev.target as HaRadio).value as "dhcp" | "static";

    if (!value || !this._device || this._device!.data.method === value) {
      return;
    }

    this._dirty = true;

    this._device!.data.method = value;
    this.requestUpdate("_device");
  }

  private _handleInputValueChanged(ev: CustomEvent): void {
    const value: string | null | undefined = (ev.target as PaperInputElement)
      .value;
    const id = (ev.target as PaperInputElement).id;

    if (!value || !this._device || this._device.data[id] === value) {
      return;
    }

    this._dirty = true;

    this._device.data[id] = value;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-network": DialogHassioNetwork;
  }
}
